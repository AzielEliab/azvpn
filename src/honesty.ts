import type { Honesty, KindLabel, LiveOp, Residual, StubOp } from "./types.js";
import {
  AUTHOR,
  GITHUB,
  IDENTITY,
  NAME,
  PRODUCT,
  SPEC_CONCENTRATOR,
  SPEC_ONION,
  VERSION,
} from "./types.js";

export const LIVE_OPS: readonly LiveOp[] = [
  "health",
  "skill",
  "doctor",
  "limitation",
  "describe",
  "open",
  "status",
  "list",
  "close",
  "send",
  "recv",
  "pull",
  "peers",
  "attach",
  "circuit",
];

export const STUB_OPS: readonly StubOp[] = [
  "wireguard",
  "wg",
  "openvpn",
  "ovpn",
  "l3_exit",
  "exit_pool",
  "udp_listen",
  "kernel_vpn",
  "tun",
  "tap",
  "socks",
  "tor",
  "origin_hiding",
];

/** Default kinds for this process when TLS is not terminating. */
export const KINDS: Record<KindLabel, Honesty> = {
  http_ws: "REAL",
  https_ws: "SLOT",
  https_tls: "SLOT",
  fraggate_envelopes: "REAL",
  websocket_attach: "REAL",
  onion_circuit_layering: "REAL",
  hybrid_pqc_handshake: "REAL",
  rendezvous_join: "REAL",
  wireguard: "SLOT",
  openvpn: "SLOT",
  l3_exit_pool: "SLOT",
  kernel_udp: "SLOT",
  tun_tap: "SLOT",
  socks: "SLOT",
  tor_public_network: "SLOT",
  origin_hiding: "SLOT",
};

export interface HonestyContext {
  tls_terminated?: boolean;
}

export function kindsFor(ctx: HonestyContext = {}): Record<KindLabel, Honesty> {
  const tls = Boolean(ctx.tls_terminated);
  return {
    ...KINDS,
    https_tls: tls ? "REAL" : "SLOT",
    https_ws: tls ? "REAL" : "SLOT",
  };
}

export function residualsFor(ctx: HonestyContext = {}): readonly { residual: Residual; note: string }[] {
  const tls = Boolean(ctx.tls_terminated);
  return [
    {
      residual: "NOT_QUANTUM_PROOF",
      note: "X25519 alone is broken by Shor. Hybrid HKDF(X25519 || ML-KEM-768) is the designed handshake; classical-only and X25519-only are refused. No silent downgrade.",
    },
    {
      residual: "NOT_QUANTUM_PROOF",
      note: tls
        ? "This process terminates Node TLS (HTTPS REAL here). Node TLS 1.2/1.3 is classical (typically X25519/P-256) — Harvest-Now-Decrypt-Later (HN-DR) on recorded TLS transcripts remains. ACME is SLOT. Catalog aziel-runtime https_ws is a neighbor Worker, not this listen()."
        : "This process serves plain HTTP/WS lab (Node http + ws) unless --tls + cert/key terminate TLS. HTTPS/TLS is SLOT until this process actually terminates TLS. Catalog aziel-runtime https_ws is a neighbor Worker, not this listen(). ACME is SLOT. When TLS does terminate, Node TLS is still classical — Harvest-Now-Decrypt-Later (HN-DR) on TLS transcripts remains.",
    },
    {
      residual: "NOT_QUANTUM_PROOF",
      note: "XChaCha20-Poly1305 is Grover-reduced AEAD, not a QKD proof. 256-bit keys stay labeled residual.",
    },
    {
      residual: "NOT_QUANTUM_PROOF",
      note: "Host metadata remains: IP, SNI (when TLS), hop roster, coarse cell-size buckets, timing. Fixed-size onion cells reduce payload-length leakage only. Padding is not origin-hiding. Public Tor stays SLOT.",
    },
    {
      residual: "NOT_QUANTUM_PROOF",
      note: "Key wipe after hop derive is best-effort (fill(0) on held buffers). V8 GC copies, JIT, swap, and core dumps remain a side-channel residual. Not a hardware guarantee.",
    },
  ];
}

export const NOT_QUANTUM_PROOF = residualsFor();

export const MOTTO =
  "App-layer envelopes and onion peel are REAL. HTTPS is REAL only when this process terminates TLS. Kernel VPN and public Tor stay SLOT.";

export function limitationText(ctx: HonestyContext = {}): string {
  const tls = Boolean(ctx.tls_terminated);
  const tlsClause = tls
    ? "This listen() terminates Node TLS (HTTPS/WSS REAL for this process only). ACME is SLOT. Node TLS is classical (HN-DR residual)."
    : "Default listen() is a standalone application-layer HTTP/WS lab concentrator (plain Node http + ws, not TLS). HTTPS/TLS is REAL only when --tls plus cert/key actually terminate TLS; otherwise SLOT.";
  return `THIS IS: AZVPN (${SPEC_CONCENTRATOR} + ${SPEC_ONION}) — ${tlsClause} Plus in-process multi-hop onion circuits (entry → middle → exit / rendezvous) with a designed hybrid PQC handshake (X25519 + ML-KEM-768; classical-only fail-closed). Encrypted envelopes, WS/WSS attach, onion layering, fixed-size cells, and local rendezvous join are REAL. Bind defaults to 127.0.0.1. THIS IS NOT: ACME, a WireGuard/OpenVPN/L3 kernel UDP concentrator, a public Tor directory/exit, SOCKS, origin-hiding fabric, or an untraceable proof. Those stay SLOT and refuse. Non-loopback listen requires --expose-non-loopback plus a bearer token or it refuses. NOT_QUANTUM_PROOF residuals stay labeled (host metadata, Grover AEAD, HN-DR, wipe side-channel). No latency theater. Sister private Lumen may adapter-pair later; this repo is standalone and holds no Lumen canon. Author: Aziel Eliab only.`;
}

export const LIMITATION = limitationText();

export const SLOT_NOTES: Record<StubOp, string> = {
  wireguard: "WireGuard UDP is SLOT. This process is not a kernel VPN concentrator.",
  wg: "WireGuard UDP is SLOT. This process is not a kernel VPN concentrator.",
  openvpn: "OpenVPN is SLOT. This process is not a kernel VPN concentrator.",
  ovpn: "OpenVPN is SLOT. This process is not a kernel VPN concentrator.",
  l3_exit: "L3 exit-IP pools are SLOT.",
  exit_pool: "L3 exit-IP pools are SLOT.",
  udp_listen: "Kernel UDP listen is SLOT.",
  kernel_vpn: "Kernel VPN is SLOT.",
  tun: "TUN devices are SLOT.",
  tap: "TAP devices are SLOT.",
  socks: "SOCKS exit is SLOT.",
  tor: "Public Tor directory / consensus / exit is SLOT. In-process onion circuits are REAL via open --mode onion.",
  origin_hiding: "Origin-hiding is SLOT. Layered peel and cell padding do not prove untraceable.",
};

export function isStubOp(op: string): op is StubOp {
  return (STUB_OPS as readonly string[]).includes(op);
}

export function isLiveOp(op: string): op is LiveOp {
  return (LIVE_OPS as readonly string[]).includes(op);
}

export function honestyBanner(ctx: HonestyContext = {}) {
  const tls = Boolean(ctx.tls_terminated);
  const kinds = kindsFor(ctx);
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: `${SPEC_CONCENTRATOR} + ${SPEC_ONION}`,
    author: AUTHOR,
    identity: IDENTITY,
    license: "Apache-2.0",
    github: GITHUB,
    motto: MOTTO,
    limitation: limitationText(ctx),
    live_ops: [...LIVE_OPS],
    stub_ops: [...STUB_OPS],
    kinds,
    transport: {
      lab: tls ? "https_ws" : "http_ws",
      honesty: tls ? kinds.https_ws : kinds.http_ws,
      tls,
      https_tls: kinds.https_tls,
      https_ws_catalog_name: kinds.https_ws,
      acme: "SLOT" as const,
      note: tls
        ? "This process terminates Node TLS. HTTPS/WSS is REAL here. ACME is SLOT. Catalog aziel-runtime https_ws is a neighbor Worker."
        : "https_ws is a FragGate catalog kind name. This process is HTTP/WS lab unless --tls + cert/key terminate TLS.",
    },
    honesty: {
      http_ws: kinds.http_ws,
      https_ws: kinds.https_ws,
      https_tls: kinds.https_tls,
      fraggate_envelopes: kinds.fraggate_envelopes,
      websocket_attach: kinds.websocket_attach,
      onion_circuit_layering: kinds.onion_circuit_layering,
      hybrid_pqc_handshake: kinds.hybrid_pqc_handshake,
      rendezvous_join: kinds.rendezvous_join,
      wireguard: kinds.wireguard,
      openvpn: kinds.openvpn,
      l3_exit_pool: kinds.l3_exit_pool,
      tor_public_network: kinds.tor_public_network,
      origin_hiding: kinds.origin_hiding,
    },
    residuals: [...residualsFor(ctx)],
    claims_refused: ["untraceable proven", "origin hiding", "latency theater"],
    lumen: {
      pairing: "adapter-later",
      private_canon_in_this_repo: false,
      note: "Lumen stays private. AZVPN is standalone.",
    },
  };
}
