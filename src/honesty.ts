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

export const NOT_QUANTUM_PROOF: readonly { residual: Residual; note: string }[] = [
  {
    residual: "NOT_QUANTUM_PROOF",
    note: "X25519 alone is broken by Shor. Hybrid HKDF(X25519 || ML-KEM-768) is the designed handshake; X25519-only is refused.",
  },
  {
    residual: "NOT_QUANTUM_PROOF",
    note: "This process serves plain HTTP/WS lab (Node http + ws). It does not terminate TLS. HTTPS/TLS is SLOT here. Catalog aziel-runtime https_ws is a neighbor Worker, not this listen().",
  },
  {
    residual: "NOT_QUANTUM_PROOF",
    note: "XChaCha20-Poly1305 is Grover-reduced, not a QKD proof. 256-bit keys stay labeled residual.",
  },
  {
    residual: "NOT_QUANTUM_PROOF",
    note: "Metadata remains: hop roster, sizes, timing. No mix-net delay is added and none is faked.",
  },
];

export const MOTTO = "App-layer envelopes and onion peel are REAL. Kernel VPN and public Tor stay SLOT.";

export const LIMITATION =
  "THIS IS: AZVPN (AZVPN-CONCENTRATOR-1.0 + AZVPN-ONION-1.0) — a standalone application-layer HTTP/WS lab concentrator (plain Node http + ws, not TLS) plus in-process multi-hop onion circuits (entry → middle → exit / rendezvous) with a designed hybrid PQC handshake (X25519 + ML-KEM-768). HTTP/WS lab, encrypted envelopes, WS attach, onion layering, and local rendezvous join are REAL. Bind defaults to 127.0.0.1. THIS IS NOT: HTTPS/TLS termination, a WireGuard/OpenVPN/L3 kernel UDP concentrator, a public Tor directory/exit, SOCKS, origin-hiding fabric, or an untraceable proof. Those stay SLOT and refuse. Non-loopback listen requires --expose-non-loopback plus a bearer token or it refuses. NOT_QUANTUM_PROOF residuals stay labeled. No latency theater. Sister private Lumen may adapter-pair later; this repo is standalone and holds no Lumen canon. Author: Aziel Eliab only.";

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
  origin_hiding: "Origin-hiding is SLOT. Layered peel does not prove untraceable.",
};

export function isStubOp(op: string): op is StubOp {
  return (STUB_OPS as readonly string[]).includes(op);
}

export function isLiveOp(op: string): op is LiveOp {
  return (LIVE_OPS as readonly string[]).includes(op);
}

export function honestyBanner() {
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
    limitation: LIMITATION,
    live_ops: [...LIVE_OPS],
    stub_ops: [...STUB_OPS],
    kinds: { ...KINDS },
    transport: {
      lab: "http_ws",
      honesty: KINDS.http_ws,
      tls: false,
      https_tls: KINDS.https_tls,
      https_ws_catalog_name: KINDS.https_ws,
      note: "https_ws is a FragGate catalog kind name. This process is HTTP/WS lab, not TLS.",
    },
    honesty: {
      http_ws: KINDS.http_ws,
      https_ws: KINDS.https_ws,
      https_tls: KINDS.https_tls,
      fraggate_envelopes: KINDS.fraggate_envelopes,
      websocket_attach: KINDS.websocket_attach,
      onion_circuit_layering: KINDS.onion_circuit_layering,
      hybrid_pqc_handshake: KINDS.hybrid_pqc_handshake,
      rendezvous_join: KINDS.rendezvous_join,
      wireguard: KINDS.wireguard,
      openvpn: KINDS.openvpn,
      l3_exit_pool: KINDS.l3_exit_pool,
      tor_public_network: KINDS.tor_public_network,
      origin_hiding: KINDS.origin_hiding,
    },
    residuals: [...NOT_QUANTUM_PROOF],
    claims_refused: ["untraceable proven", "origin hiding", "latency theater"],
    lumen: {
      pairing: "adapter-later",
      private_canon_in_this_repo: false,
      note: "Lumen stays private. AZVPN is standalone.",
    },
  };
}
