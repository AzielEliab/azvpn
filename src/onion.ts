import { fromUtf8, id, toHex, utf8 } from "./bytes.js";
import { open, seal } from "./crypto.js";
import {
  acceptHandshake,
  generateHopIdentity,
  hybridHandshake,
  type HandshakeOffer,
  type HopIdentity,
} from "./handshake.js";
import type { CircuitHop, CircuitStatus, HopRole, SessionMode } from "./types.js";

export interface BuiltHop {
  role: HopRole;
  identity: HopIdentity;
  client_key: Uint8Array;
  offer: HandshakeOffer;
}

export interface OnionCircuit {
  circuit_id: string;
  mode: SessionMode;
  hops: BuiltHop[];
  rendezvous_cookie?: string;
}

export interface PeelStep {
  hop_id: string;
  role: HopRole;
  next?: string;
  remaining_hex: string;
}

const LAYER_AAD = utf8("AZVPN-ONION-1.0");

function packLayer(next: string | undefined, inner: string): Uint8Array {
  return utf8(JSON.stringify({ next: next ?? null, inner }));
}

function unpackLayer(bytes: Uint8Array): { next?: string; inner: string } {
  const parsed = JSON.parse(fromUtf8(bytes)) as { next?: string | null; inner: string };
  if (typeof parsed.inner !== "string") throw new Error("AZVPN-BAD-LAYER");
  return { next: parsed.next ?? undefined, inner: parsed.inner };
}

export function defaultRelayRoster(): HopIdentity[] {
  return [
    generateHopIdentity("entry.azvpn.local"),
    generateHopIdentity("middle.azvpn.local"),
    generateHopIdentity("exit.azvpn.local"),
    generateHopIdentity("rend.azvpn.local"),
  ];
}

export function selectHops(roster: HopIdentity[], mode: SessionMode): { role: HopRole; identity: HopIdentity }[] {
  const byId = new Map(roster.map((h) => [h.hop_id, h]));
  const need = (hop_id: string, role: HopRole) => {
    const identity = byId.get(hop_id);
    if (!identity) throw new Error("AZVPN-MISSING-HOP");
    return { role, identity };
  };
  if (mode === "https_ws") return [];
  if (mode === "rendezvous") {
    return [
      need("entry.azvpn.local", "entry"),
      need("middle.azvpn.local", "middle"),
      need("rend.azvpn.local", "rendezvous"),
    ];
  }
  return [
    need("entry.azvpn.local", "entry"),
    need("middle.azvpn.local", "middle"),
    need("exit.azvpn.local", "exit"),
  ];
}

export function buildCircuit(roster: HopIdentity[], mode: SessionMode, cookie?: string): OnionCircuit {
  const selected = selectHops(roster, mode);
  const hops: BuiltHop[] = selected.map(({ role, identity }) => {
    const hs = hybridHandshake(identity);
    const accepted = acceptHandshake(identity, hs.offer);
    if (toHex(hs.key) !== toHex(accepted)) throw new Error("AZVPN-HANDSHAKE-MISMATCH");
    return { role, identity, client_key: hs.key, offer: hs.offer };
  });
  return {
    circuit_id: id("circ"),
    mode,
    hops,
    rendezvous_cookie: mode === "rendezvous" ? cookie ?? id("rend", 8) : undefined,
  };
}

/** Wrap exit → middle → entry so each hop peels one layer. */
export function wrapOnion(circuit: OnionCircuit, plaintext: Uint8Array): string {
  if (circuit.hops.length === 0) return seal(utf8("unused".padEnd(32, "0")).slice(0, 32), plaintext);
  let current = toHex(plaintext);
  for (let i = circuit.hops.length - 1; i >= 0; i -= 1) {
    const hop = circuit.hops[i];
    const next = i + 1 < circuit.hops.length ? circuit.hops[i + 1].identity.hop_id : undefined;
    current = seal(hop.client_key, packLayer(next, current), LAYER_AAD);
  }
  return current;
}

export function peelAtHop(hop: BuiltHop, packed: string): { next?: string; inner: string } {
  return unpackLayer(open(hop.client_key, packed, LAYER_AAD));
}

/** Transit entry → middle → exit / rendezvous. REAL peel, no fake latency. */
export function transit(circuit: OnionCircuit, onion: string): { plaintext: Uint8Array; steps: PeelStep[] } {
  let current = onion;
  const steps: PeelStep[] = [];
  for (const hop of circuit.hops) {
    const peeled = peelAtHop(hop, current);
    current = peeled.inner;
    steps.push({
      hop_id: hop.identity.hop_id,
      role: hop.role,
      next: peeled.next,
      remaining_hex: current.length > 64 ? `${current.slice(0, 64)}…` : current,
    });
  }
  return { plaintext: Buffer.from(current, "hex"), steps };
}

export function circuitStatus(circuit: OnionCircuit): CircuitStatus {
  const hops: CircuitHop[] = circuit.hops.map((h) => ({
    role: h.role,
    hop_id: h.identity.hop_id,
    handshake: "hybrid-x25519-mlkem768",
    honesty: "REAL",
  }));
  const shape = hops.length ? hops.map((h) => h.role).join(" → ") : "direct https_ws";
  return {
    circuit_id: circuit.circuit_id,
    mode: circuit.mode,
    hops,
    shape,
    rendezvous_cookie: circuit.rendezvous_cookie,
    honesty: circuit.mode === "https_ws" ? "REAL" : "REAL",
    note:
      circuit.mode === "https_ws"
        ? "Direct concentrator session. No onion hops."
        : "In-process layered circuit. Public Tor directory / origin-hiding stay SLOT. Not untraceable proven.",
  };
}

export function wrapHttpsEnvelope(sessionKey: Uint8Array, plaintext: Uint8Array): string {
  return seal(sessionKey, plaintext, utf8("AZVPN-ENVELOPE-1.0"));
}

export function openHttpsEnvelope(sessionKey: Uint8Array, packed: string): Uint8Array {
  return open(sessionKey, packed, utf8("AZVPN-ENVELOPE-1.0"));
}
