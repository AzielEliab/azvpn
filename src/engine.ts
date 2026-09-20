import { fromUtf8, id, randomBytes, toHex, utf8 } from "./bytes.js";
import { honestyBanner, isStubOp, LIMITATION, SLOT_NOTES } from "./honesty.js";
import { generateHopIdentity, hybridHandshake, refuseX25519Only, type HopIdentity } from "./handshake.js";
import {
  buildCircuit,
  circuitStatus,
  defaultRelayRoster,
  openHttpsEnvelope,
  transit,
  wrapHttpsEnvelope,
  wrapOnion,
  type OnionCircuit,
} from "./onion.js";
import { AUTHOR, GITHUB, IDENTITY, PRODUCT, type SessionMode } from "./types.js";
import { skillMarkdown } from "./skill-text.js";

export interface SessionRecord {
  session_id: string;
  peer: string;
  mode: SessionMode;
  opened_at: string;
  closed: boolean;
  circuit?: OnionCircuit;
  session_key: Uint8Array;
  inbox: { id: string; ciphertext_hex: string; layers: number; created_at: string; plaintext_note?: string }[];
  attach_ticket?: string;
}

export interface EngineOptions {
  now?: () => Date;
  roster?: HopIdentity[];
}

export type EngineResult = Record<string, unknown>;

function asMode(value: unknown): SessionMode {
  if (value === "onion" || value === "rendezvous" || value === "http_ws") return value;
  if (value === "https_ws") return "http_ws";
  if (value === "tor") {
    throw Object.assign(new Error("SLOT"), { code: "AZVPN-SLOT", op: "tor" });
  }
  return "http_ws";
}

export class AzvpnEngine {
  readonly roster: HopIdentity[];
  readonly sessions = new Map<string, SessionRecord>();
  readonly rendezvous = new Map<string, Set<string>>();
  private readonly now: () => Date;

  constructor(opts: EngineOptions = {}) {
    this.now = opts.now ?? (() => new Date());
    this.roster = opts.roster ?? defaultRelayRoster();
  }

  iso(): string {
    return this.now().toISOString();
  }

  dispatch(op: string, payload: Record<string, unknown> = {}): EngineResult {
    if (isStubOp(op) || op === "x25519_only") {
      if (op === "x25519_only") return refuseX25519Only();
      return {
        ok: false,
        code: "AZVPN-SLOT",
        honesty: "SLOT",
        op,
        note: SLOT_NOTES[op as keyof typeof SLOT_NOTES] ?? "SLOT.",
      };
    }
    switch (op) {
      case "health":
        return this.health();
      case "doctor":
        return this.doctor();
      case "limitation":
        return this.limitation();
      case "skill":
        return this.skill();
      case "describe":
        return this.describe(payload);
      case "open":
        return this.open(payload);
      case "status":
        return this.status(payload);
      case "list":
        return this.list();
      case "close":
        return this.close(payload);
      case "send":
        return this.send(payload);
      case "recv":
      case "pull":
        return this.recv(payload);
      case "peers":
        return this.peers();
      case "attach":
        return this.attach(payload);
      case "circuit":
        return this.circuit(payload);
      default:
        return { ok: false, code: "AZVPN-UNKNOWN-OP", note: `Unknown op ${op}.` };
    }
  }

  health(): EngineResult {
    return {
      ok: true,
      op: "health",
      status: "ok",
      role: "application-layer tunnel concentrator + in-process onion router",
      ...honestyBanner(),
      open_tunnels: [...this.sessions.values()].filter((s) => !s.closed).length,
      worker_terminates_tunnels: true,
      worker_terminates_kernel_udp: false,
      wireguard: false,
      openvpn: false,
      l3_exit_pool: false,
      tor: false,
      socks: false,
      origin_hiding: false,
      standalone: true,
      github: GITHUB,
    };
  }

  doctor(): EngineResult {
    return {
      ok: true,
      op: "doctor",
      product: PRODUCT,
      matrix: honestyBanner().honesty,
      kinds: honestyBanner().kinds,
      residuals: honestyBanner().residuals,
      open_tunnels: [...this.sessions.values()].filter((s) => !s.closed).length,
      relays: this.roster.map((r) => r.hop_id),
      note: "Doctor reports the REAL/SLOT matrix. It does not invent latency or claim a public Tor overlay.",
    };
  }

  limitation(): EngineResult {
    return {
      ok: true,
      op: "limitation",
      ...honestyBanner(),
    };
  }

  skill(): EngineResult {
    return { ok: true, op: "skill", markdown: skillMarkdown() };
  }

  describe(payload: Record<string, unknown>): EngineResult {
    const kind = typeof payload.kind === "string" ? payload.kind : "http_ws";
    const banner = honestyBanner();
    const mapped = kind === "https_ws" ? "http_ws" : kind;
    return {
      ok: true,
      op: "describe",
      kind: mapped,
      requested: kind,
      honesty: (banner.kinds as Record<string, string>)[kind] ?? (banner.kinds as Record<string, string>)[mapped] ?? "SLOT",
      tls: false,
      peer: typeof payload.peer === "string" ? payload.peer : null,
      concentrator: "http_ws",
      onion: "in-process layered circuits",
      public_tor: "SLOT",
      https_tls: "SLOT",
      note: LIMITATION,
    };
  }

  open(payload: Record<string, unknown>): EngineResult {
    let mode: SessionMode;
    try {
      mode = asMode(payload.mode ?? payload.kind);
    } catch (err) {
      const e = err as { code?: string; op?: string };
      return {
        ok: false,
        code: e.code ?? "AZVPN-SLOT",
        honesty: "SLOT",
        op: e.op ?? "tor",
        note: SLOT_NOTES.tor,
      };
    }
    const peer = typeof payload.peer === "string" && payload.peer ? payload.peer : "peer-local";
    const cookie = typeof payload.cookie === "string" ? payload.cookie : undefined;
    const session_id = id("sess");
    const hs = hybridHandshake(generateHopIdentity(`session.${session_id}`));
    const circuit = mode === "http_ws" ? undefined : buildCircuit(this.roster, mode, cookie);
    if (circuit?.rendezvous_cookie) {
      const set = this.rendezvous.get(circuit.rendezvous_cookie) ?? new Set<string>();
      set.add(session_id);
      this.rendezvous.set(circuit.rendezvous_cookie, set);
    }
    const record: SessionRecord = {
      session_id,
      peer,
      mode,
      opened_at: this.iso(),
      closed: false,
      circuit,
      session_key: hs.key,
      inbox: [],
    };
    this.sessions.set(session_id, record);
    return {
      ok: true,
      op: "open",
      honesty: "REAL",
      session_id,
      peer,
      mode,
      handshake: hs.handshake,
      residuals: hs.residuals,
      circuit: circuit ? circuitStatus(circuit) : { shape: "direct http_ws (lab)", honesty: "REAL", tls: false },
      transport: { lab: "http_ws", tls: false, https_tls: "SLOT" },
      receipt: {
        session_id,
        opened_at: record.opened_at,
        author: AUTHOR,
        identity: IDENTITY,
      },
      note:
        mode === "http_ws"
          ? "Application-layer HTTP/WS lab session opened. Not TLS. Not a kernel VPN."
          : "Onion circuit built in-process. Public Tor / origin-hiding stay SLOT. Not untraceable proven.",
    };
  }

  private sessionOrError(payload: Record<string, unknown>): { rec: SessionRecord; err?: undefined } | { rec?: undefined; err: EngineResult } {
    const session_id =
      typeof payload.session_id === "string" ? payload.session_id : typeof payload.id === "string" ? payload.id : "";
    const rec = this.sessions.get(session_id);
    if (!rec) return { err: { ok: false, code: "AZVPN-NO-SESSION", note: "Unknown session_id." } };
    if (rec.closed) return { err: { ok: false, code: "AZVPN-CLOSED", note: "Session is closed." } };
    return { rec };
  }

  status(payload: Record<string, unknown>): EngineResult {
    const got = this.sessionOrError(payload);
    if (got.err) return got.err;
    const rec = got.rec;
    return {
      ok: true,
      op: "status",
      honesty: "REAL",
      session_id: rec.session_id,
      peer: rec.peer,
      mode: rec.mode,
      opened_at: rec.opened_at,
      closed: rec.closed,
      inbox: rec.inbox.length,
      circuit: rec.circuit ? circuitStatus(rec.circuit) : { shape: "direct http_ws (lab)", honesty: "REAL", tls: false },
      attach_ticket: rec.attach_ticket ?? null,
    };
  }

  list(): EngineResult {
    return {
      ok: true,
      op: "list",
      honesty: "REAL",
      sessions: [...this.sessions.values()].map((s) => ({
        session_id: s.session_id,
        peer: s.peer,
        mode: s.mode,
        opened_at: s.opened_at,
        closed: s.closed,
        shape: s.circuit ? circuitStatus(s.circuit).shape : "direct http_ws (lab)",
      })),
    };
  }

  close(payload: Record<string, unknown>): EngineResult {
    const got = this.sessionOrError(payload);
    if (got.err) return got.err;
    const rec = got.rec;
    rec.closed = true;
    return { ok: true, op: "close", honesty: "REAL", session_id: rec.session_id, closed: true };
  }

  send(payload: Record<string, unknown>): EngineResult {
    const got = this.sessionOrError(payload);
    if (got.err) return got.err;
    const rec = got.rec;
    const text = typeof payload.text === "string" ? payload.text : typeof payload.body === "string" ? payload.body : "";
    if (!text) return { ok: false, code: "AZVPN-NO-BODY", note: "send requires text." };
    const plaintext = utf8(text);
    let ciphertext_hex: string;
    let layers = 1;
    if (rec.circuit && rec.circuit.hops.length > 0) {
      ciphertext_hex = wrapOnion(rec.circuit, plaintext);
      layers = rec.circuit.hops.length;
      const delivered = transit(rec.circuit, ciphertext_hex);
      const dests = this.destinations(rec);
      for (const dest of dests) {
        dest.inbox.push({
          id: id("env"),
          ciphertext_hex,
          layers,
          created_at: this.iso(),
          plaintext_note: fromUtf8(delivered.plaintext),
        });
      }
    } else {
      ciphertext_hex = wrapHttpsEnvelope(rec.session_key, plaintext);
      rec.inbox.push({
        id: id("env"),
        ciphertext_hex,
        layers: 1,
        created_at: this.iso(),
        plaintext_note: text,
      });
    }
    return {
      ok: true,
      op: "send",
      honesty: "REAL",
      session_id: rec.session_id,
      envelope_id: rec.inbox.at(-1)?.id ?? null,
      layers,
      note: "Queued ciphertext. Peel is in-process. No latency number is invented.",
    };
  }

  recv(payload: Record<string, unknown>): EngineResult {
    const got = this.sessionOrError(payload);
    if (got.err) return got.err;
    const rec = got.rec;
    const items = rec.inbox.splice(0, rec.inbox.length);
    const opened = items.map((item) => {
      if (rec.circuit) {
        try {
          const peeled = transit(rec.circuit, item.ciphertext_hex);
          return {
            id: item.id,
            layers: item.layers,
            created_at: item.created_at,
            text: fromUtf8(peeled.plaintext),
            peel: peeled.steps.map((s) => ({ hop_id: s.hop_id, role: s.role, next: s.next ?? null })),
          };
        } catch {
          return {
            id: item.id,
            layers: item.layers,
            created_at: item.created_at,
            text: item.plaintext_note ?? "",
            peel: [{ hop_id: "rend.azvpn.local", role: "rendezvous", next: null }],
            note: "Delivered at rendezvous after sender peel. Peer circuit keys differ; this is join delivery, not a shared-key claim.",
          };
        }
      }
      return {
        id: item.id,
        layers: item.layers,
        created_at: item.created_at,
        text: fromUtf8(openHttpsEnvelope(rec.session_key, item.ciphertext_hex)),
        peel: [],
      };
    });
    return { ok: true, op: "recv", honesty: "REAL", session_id: rec.session_id, envelopes: opened };
  }

  peers(): EngineResult {
    return {
      ok: true,
      op: "peers",
      honesty: "REAL",
      peers: [...this.sessions.values()]
        .filter((s) => !s.closed)
        .map((s) => ({ session_id: s.session_id, peer: s.peer, mode: s.mode })),
    };
  }

  attach(payload: Record<string, unknown>): EngineResult {
    const got = this.sessionOrError(payload);
    if (got.err) return got.err;
    const rec = got.rec;
    rec.attach_ticket = `tkt_${toHex(randomBytes(16))}`;
    return {
      ok: true,
      op: "attach",
      honesty: "REAL",
      session_id: rec.session_id,
      ticket: rec.attach_ticket,
      path: "/v1/ws",
      note: "WS attach ticket for the same inbox. Not a second door. Not a kernel VPN.",
    };
  }

  circuit(payload: Record<string, unknown>): EngineResult {
    const got = this.sessionOrError(payload);
    if (got.err) return got.err;
    const rec = got.rec;
    return {
      ok: true,
      op: "circuit",
      honesty: "REAL",
      session_id: rec.session_id,
      circuit: rec.circuit ? circuitStatus(rec.circuit) : { shape: "direct http_ws (lab)", honesty: "REAL", tls: false },
      residuals: honestyBanner().residuals,
    };
  }

  findByTicket(ticket: string): SessionRecord | undefined {
    return [...this.sessions.values()].find((s) => s.attach_ticket === ticket && !s.closed);
  }

  private destinations(rec: SessionRecord): SessionRecord[] {
    if (rec.mode === "rendezvous" && rec.circuit?.rendezvous_cookie) {
      const ids = this.rendezvous.get(rec.circuit.rendezvous_cookie) ?? new Set([rec.session_id]);
      const out = [...ids].map((id_) => this.sessions.get(id_)).filter((s): s is SessionRecord => !!s && !s.closed);
      return out.length ? out : [rec];
    }
    return [rec];
  }
}

export function createEngine(opts?: EngineOptions): AzvpnEngine {
  return new AzvpnEngine(opts);
}
