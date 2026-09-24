import { AUTHOR, NAME, VERSION } from "./types.js";

const KIND_LABELS: Record<string, string> = {
  http_ws: "HTTP and WebSocket lab",
  https_ws: "HTTPS on this process",
  https_tls: "TLS termination on this process",
  fraggate_envelopes: "Encrypted envelopes",
  websocket_attach: "WebSocket attach",
  onion_circuit_layering: "Onion circuits in this process",
  hybrid_pqc_handshake: "Hybrid handshake (X25519 + ML-KEM-768)",
  rendezvous_join: "Local rendezvous",
  wireguard: "WireGuard",
  openvpn: "OpenVPN",
  l3_exit_pool: "L3 exit pool",
  kernel_udp: "Kernel UDP",
  tun_tap: "TUN and TAP",
  socks: "SOCKS",
  tor_public_network: "Public Tor",
  origin_hiding: "Origin hiding",
};

export function helpText(): string {
  return `${NAME} ${VERSION} — open a lab session on this computer

Usage:
  azvpn <command> [options]

Common commands:
  ui        Start the local page on 127.0.0.1
  health    Show whether this process is ready
  open      Open a session with a peer
  status    Show one session
  send      Send a message on a session
  recv      Read messages waiting on a session
  close     Close a session
  doctor    Show what is working on this machine

Examples:
  azvpn ui
  azvpn open --peer alice --mode onion
  azvpn send --id SESSION --text hello
  azvpn --json health

Options:
  --json           Print machine JSON
  --state PATH     State file (default ./.azvpn-state.json)
  --peer NAME      Peer name
  --mode MODE      http_ws, onion, or rendezvous
  --id SESSION     Session id
  --text MSG       Message text
  -h, --help       Show this help
  --version        Show version

Lab TLS, certificates, and non-loopback bind:
  azvpn help advanced

Author: ${AUTHOR}
`;
}

export function helpAdvancedText(): string {
  return `${NAME} advanced

Commands:
  list         List sessions
  peers        List open peers
  attach       Make a WebSocket attach ticket
  circuit      Show the circuit for a session
  cert         Write a lab certificate
  serve        Same as ui
  limitation   Print the REAL / SLOT labels
  skill        Print the skill text
  describe     Describe one kind
  pull         Same as recv

Examples:
  azvpn cert --dir ./lab-tls
  azvpn ui --tls --tls-cert ./lab-tls/cert.pem --tls-key ./lab-tls/key.pem
  azvpn circuit --id SESSION
  azvpn --json limitation

Lab TLS (fail closed):
  HTTPS is REAL only when --tls plus a cert and key terminate TLS on this process.
  Default listen is the HTTP/WS lab. ACME is SLOT.
  Node TLS is classical (HN-DR residual).
  --tls                  require cert and key
  --tls-cert PATH        or AZVPN_TLS_CERT
  --tls-key PATH         or AZVPN_TLS_KEY
  AZVPN_TLS=1            same as --tls

Bind:
  Default is 127.0.0.1. Non-loopback is refused unless both:
    --expose-non-loopback
    --token TOKEN        or AZVPN_TOKEN, at least 16 characters
  Query ?token= leaks in logs and Referer. Prefer loopback.

HTTP/WS lab and in-process onion circuits are REAL on this process.
WireGuard, public Tor, origin-hiding, and ACME are SLOT.

Author: ${AUTHOR}
`;
}

export function welcomeText(): string {
  return `${NAME} opens a lab session on this computer so you can send a message over local HTTP, with onion hops in this process when you ask for them.

Next: start the local page.

  azvpn ui

Also: azvpn health    azvpn doctor    azvpn --help

Author: ${AUTHOR}
`;
}

export function welcomeJson(): Record<string, unknown> {
  return {
    ok: true,
    name: NAME,
    version: VERSION,
    author: AUTHOR,
    next: ["azvpn ui", "azvpn health", "azvpn doctor", "azvpn --help"],
  };
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function circuitShape(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const shape = (value as { shape?: unknown }).shape;
  return typeof shape === "string" ? shape : undefined;
}

export function presentError(command: string, result: Record<string, unknown>, hadId: boolean): string {
  const code = text(result.code) ?? "";
  const note = text(result.note) ?? "That did not work.";
  if (code === "AZVPN-UNKNOWN-OP") {
    const name = command || "command";
    return `Unknown command "${name}". Try: azvpn ui   or   azvpn --help\n`;
  }
  if (code === "AZVPN-NO-SESSION") {
    if (!hadId) return `This command needs a session id.\nNext: azvpn open --peer alice\n`;
    return `No session with that id.\nNext: azvpn list   or   azvpn open --peer alice\n`;
  }
  if (code === "AZVPN-CLOSED") {
    return `That session is already closed.\nNext: azvpn open --peer alice\n`;
  }
  if (code === "AZVPN-NO-BODY") {
    return `Send needs a message.\nNext: azvpn send --id SESSION --text hello\n`;
  }
  if (code === "AZVPN-SLOT") {
    return `${note}\nNext: azvpn open --mode onion   or   azvpn help advanced\n`;
  }
  if (code === "AZVPN-TLS-REQUIRED") {
    return `TLS did not start. A certificate and a key are required.\nNext: azvpn cert --dir ./lab-tls\n      azvpn ui --tls --tls-cert ./lab-tls/cert.pem --tls-key ./lab-tls/key.pem\n(${code})\n`;
  }
  if (code === "AZVPN-BIND-REFUSED") {
    return `Listening off this machine was refused. AZVPN stays on 127.0.0.1 unless you opt in.\nNext: azvpn ui\n      or azvpn ui --host 0.0.0.0 --expose-non-loopback --token YOUR_TOKEN\n(${code})\n`;
  }
  if (code === "AZVPN-AUTH-REQUIRED" || code === "AZVPN-AUTH-WEAK") {
    return `${note}\nNext: pass --token with at least 16 characters, together with --expose-non-loopback.\n(${code})\n`;
  }
  if (code === "AZVPN-NOT-QUANTUM-PROOF") {
    return `${note}\nNext: azvpn open --peer alice --mode onion\n`;
  }
  if (code === "AZVPN-BAD-PORT") {
    return `${note}\nNext: azvpn ui --port 8787\n`;
  }
  return `${note}\nNext: azvpn --help\n`;
}

function presentKinds(title: string, kinds: Record<string, unknown>): string {
  const lines = [title, ""];
  for (const [key, value] of Object.entries(kinds)) {
    const mark = value === "REAL" ? "ok  " : "slot";
    lines.push(`  ${mark}  ${KIND_LABELS[key] ?? key}`);
  }
  return lines.join("\n");
}

function presentHealth(result: Record<string, unknown>): string {
  const transport = result.transport as { tls?: boolean } | undefined;
  const tls = Boolean(transport?.tls);
  const where = tls ? "HTTPS (this process is terminating TLS)" : "HTTP/WS lab";
  const sessions = typeof result.open_tunnels === "number" ? result.open_tunnels : 0;
  return `${NAME} is ready.
  Open sessions: ${sessions}
  Transport: ${where}

Next: azvpn ui
`;
}

function presentDoctor(result: Record<string, unknown>): string {
  const kinds = (result.kinds ?? result.matrix) as Record<string, unknown> | undefined;
  const body = kinds && typeof kinds === "object" ? presentKinds(`${NAME} doctor`, kinds) : `${NAME} doctor`;
  const sessions = typeof result.open_tunnels === "number" ? result.open_tunnels : 0;
  const relays = Array.isArray(result.relays) ? result.relays.map(String).join(", ") : "";
  return `${body}

Open sessions: ${sessions}${relays ? `\nRelays: ${relays}` : ""}

ok means this process does it. slot means it stays refused.

Next: azvpn ui
`;
}

function presentOpen(result: Record<string, unknown>): string {
  const id = text(result.session_id) ?? "";
  const shape = circuitShape(result.circuit) ?? text(result.mode) ?? "";
  return `Session opened.
  id    ${id}
  peer  ${text(result.peer) ?? ""}
  mode  ${text(result.mode) ?? ""}
  path  ${shape}

Next: azvpn send --id ${id} --text hello
`;
}

function presentSend(result: Record<string, unknown>): string {
  const id = text(result.session_id) ?? "SESSION";
  const layers = typeof result.layers === "number" ? result.layers : "";
  return `Message queued.
  session  ${id}
  layers   ${layers}

Next: azvpn recv --id ${id}
`;
}

function presentRecv(result: Record<string, unknown>): string {
  const id = text(result.session_id) ?? "";
  const envelopes = Array.isArray(result.envelopes) ? result.envelopes : [];
  if (!envelopes.length) return `No messages waiting${id ? ` on ${id}` : ""}.\n`;
  const lines = envelopes.map((item) => {
    if (!item || typeof item !== "object") return "  (message)";
    const body = text((item as { text?: unknown }).text) ?? "";
    return `  ${body}`;
  });
  const noun = envelopes.length === 1 ? "message" : "messages";
  return `${envelopes.length} ${noun}${id ? ` on ${id}` : ""}.\n${lines.join("\n")}\n`;
}

function presentStatus(result: Record<string, unknown>): string {
  const id = text(result.session_id) ?? "";
  const state = result.closed ? "closed" : "open";
  return `Session ${id}
  peer   ${text(result.peer) ?? ""}
  mode   ${text(result.mode) ?? ""}
  path   ${circuitShape(result.circuit) ?? ""}
  inbox  ${typeof result.inbox === "number" ? result.inbox : 0}
  state  ${state}
`;
}

function presentList(result: Record<string, unknown>): string {
  const sessions = Array.isArray(result.sessions) ? result.sessions : [];
  if (!sessions.length) return `No sessions yet.\nNext: azvpn open --peer alice\n`;
  const lines = ["Sessions", ""];
  for (const item of sessions) {
    if (!item || typeof item !== "object") continue;
    const row = item as { session_id?: unknown; peer?: unknown; mode?: unknown; closed?: unknown; shape?: unknown };
    const state = row.closed ? "closed" : "open";
    lines.push(`  ${String(row.session_id ?? "")}  ${String(row.peer ?? "")}  ${String(row.mode ?? "")}  ${state}`);
    if (typeof row.shape === "string") lines.push(`    path  ${row.shape}`);
  }
  return `${lines.join("\n")}\n`;
}

function presentPeers(result: Record<string, unknown>): string {
  const peers = Array.isArray(result.peers) ? result.peers : [];
  if (!peers.length) return `No open peers.\nNext: azvpn open --peer alice\n`;
  const lines = ["Open peers", ""];
  for (const item of peers) {
    if (!item || typeof item !== "object") continue;
    const row = item as { session_id?: unknown; peer?: unknown; mode?: unknown };
    lines.push(`  ${String(row.peer ?? "")}  ${String(row.mode ?? "")}  ${String(row.session_id ?? "")}`);
  }
  return `${lines.join("\n")}\n`;
}

function presentClose(result: Record<string, unknown>): string {
  const id = text(result.session_id) ?? "";
  return `Session closed.
  id  ${id}
`;
}

function presentAttach(result: Record<string, unknown>): string {
  return `Attach ticket ready.
  session  ${text(result.session_id) ?? ""}
  ticket   ${text(result.ticket) ?? ""}
  path     ${text(result.path) ?? "/v1/ws"}

Next: connect a WebSocket to that path with ?ticket=
`;
}

function presentCircuit(result: Record<string, unknown>): string {
  const circuit = result.circuit as { shape?: unknown; honesty?: unknown } | undefined;
  return `Circuit
  session  ${text(result.session_id) ?? ""}
  path     ${circuitShape(circuit) ?? ""}
  label    ${text(circuit?.honesty) ?? text(result.honesty) ?? ""}
`;
}

function presentCert(result: Record<string, unknown>): string {
  return `Lab certificate written.
  cert  ${text(result.cert) ?? ""}
  key   ${text(result.key) ?? ""}
  cn    ${text(result.cn) ?? ""}
  ACME  SLOT

Next: azvpn ui --tls --tls-cert ${text(result.cert) ?? "./lab-tls/cert.pem"} --tls-key ${text(result.key) ?? "./lab-tls/key.pem"}
`;
}

function presentDescribe(result: Record<string, unknown>): string {
  const tls = result.tls ? "yes" : "no";
  return `Kind ${text(result.kind) ?? ""}
  requested  ${text(result.requested) ?? ""}
  label      ${text(result.honesty) ?? ""}
  TLS on     ${tls}
  ACME       SLOT
`;
}

function presentLimitation(result: Record<string, unknown>): string {
  const kinds = result.kinds as Record<string, unknown> | undefined;
  const body = kinds ? presentKinds(`${NAME} labels`, kinds) : `${NAME} labels`;
  return `${body}

Author: ${AUTHOR}
`;
}

export function present(command: string, result: Record<string, unknown>, opts: { hadId?: boolean } = {}): string {
  if (result.ok === false) return presentError(command, result, Boolean(opts.hadId));
  switch (command) {
    case "health":
      return presentHealth(result);
    case "doctor":
      return presentDoctor(result);
    case "open":
      return presentOpen(result);
    case "send":
      return presentSend(result);
    case "recv":
    case "pull":
      return presentRecv(result);
    case "status":
      return presentStatus(result);
    case "list":
      return presentList(result);
    case "peers":
      return presentPeers(result);
    case "close":
      return presentClose(result);
    case "attach":
      return presentAttach(result);
    case "circuit":
      return presentCircuit(result);
    case "cert":
      return presentCert(result);
    case "describe":
      return presentDescribe(result);
    case "limitation":
      return presentLimitation(result);
    case "skill":
      return `${text(result.markdown) ?? ""}\n`;
    default:
      return presentHealth(result);
  }
}
