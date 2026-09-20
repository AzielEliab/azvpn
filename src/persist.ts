import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fromHex, toHex } from "./bytes.js";
import { AzvpnEngine } from "./engine.js";
import type { HopIdentity } from "./handshake.js";
import type { OnionCircuit } from "./onion.js";
import type { SessionMode } from "./types.js";

interface WireSession {
  session_id: string;
  peer: string;
  mode: SessionMode;
  opened_at: string;
  closed: boolean;
  session_key_hex: string;
  attach_ticket?: string;
  inbox: { id: string; ciphertext_hex: string; layers: number; created_at: string; plaintext_note?: string }[];
  circuit?: {
    circuit_id: string;
    mode: SessionMode;
    rendezvous_cookie?: string;
    cell_size?: number;
    hops: {
      role: OnionCircuit["hops"][number]["role"];
      identity: HopIdentity;
      client_key_hex: string;
      offer: OnionCircuit["hops"][number]["offer"];
    }[];
  };
}

interface WireState {
  v: 1;
  roster: HopIdentity[];
  sessions: WireSession[];
  rendezvous: Record<string, string[]>;
}

export function saveEngine(path: string, engine: AzvpnEngine): void {
  const wire: WireState = {
    v: 1,
    roster: engine.roster,
    sessions: [...engine.sessions.values()].map((s) => ({
      session_id: s.session_id,
      peer: s.peer,
      mode: s.mode,
      opened_at: s.opened_at,
      closed: s.closed,
      session_key_hex: toHex(s.session_key),
      attach_ticket: s.attach_ticket,
      inbox: s.inbox,
      circuit: s.circuit
        ? {
            circuit_id: s.circuit.circuit_id,
            mode: s.circuit.mode,
            rendezvous_cookie: s.circuit.rendezvous_cookie,
            cell_size: s.circuit.cell_size,
            hops: s.circuit.hops.map((h) => ({
              role: h.role,
              identity: h.identity,
              client_key_hex: toHex(h.client_key),
              offer: h.offer,
            })),
          }
        : undefined,
    })),
    rendezvous: Object.fromEntries([...engine.rendezvous.entries()].map(([k, v]) => [k, [...v]])),
  };
  mkdirSync(dirname(path) === "." ? process.cwd() : dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(wire, null, 2), { mode: 0o600 });
}

export function loadEngine(path: string): AzvpnEngine {
  const raw = JSON.parse(readFileSync(path, "utf8")) as WireState;
  const engine = new AzvpnEngine({ roster: raw.roster });
  for (const s of raw.sessions ?? []) {
    engine.sessions.set(s.session_id, {
      session_id: s.session_id,
      peer: s.peer,
      mode: s.mode,
      opened_at: s.opened_at,
      closed: s.closed,
      session_key: fromHex(s.session_key_hex),
      attach_ticket: s.attach_ticket,
      inbox: s.inbox ?? [],
      circuit: s.circuit
        ? {
            circuit_id: s.circuit.circuit_id,
            mode: s.circuit.mode,
            rendezvous_cookie: s.circuit.rendezvous_cookie,
            cell_size: s.circuit.cell_size ?? 512,
            hops: s.circuit.hops.map((h) => ({
              role: h.role,
              identity: h.identity,
              client_key: fromHex(h.client_key_hex),
              offer: h.offer,
            })),
          }
        : undefined,
    });
  }
  for (const [cookie, ids] of Object.entries(raw.rendezvous ?? {})) {
    engine.rendezvous.set(cookie, new Set(ids));
  }
  return engine;
}

export function withState<T>(path: string | undefined, fn: (engine: AzvpnEngine) => T): T {
  const engine = path
    ? (() => {
        try {
          return loadEngine(path);
        } catch {
          return new AzvpnEngine();
        }
      })()
    : new AzvpnEngine();
  try {
    return fn(engine);
  } finally {
    if (path) saveEngine(path, engine);
  }
}
