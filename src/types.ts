export const PRODUCT = "azvpn" as const;
export const NAME = "AZVPN" as const;
export const VERSION = "0.1.0" as const;
export const AUTHOR = "Aziel Eliab" as const;
export const IDENTITY = "Aziel Eliab" as const;
export const SPEC_CONCENTRATOR = "AZVPN-CONCENTRATOR-1.0" as const;
export const SPEC_ONION = "AZVPN-ONION-1.0" as const;
export const LICENSE = "Apache-2.0" as const;
export const GITHUB = "https://github.com/AzielEliab/azvpn" as const;

export type Honesty = "REAL" | "SLOT";
export type Residual = "NOT_QUANTUM_PROOF";

export type SessionMode = "https_ws" | "onion" | "rendezvous";
export type HopRole = "entry" | "middle" | "exit" | "rendezvous";

export type LiveOp =
  | "health"
  | "skill"
  | "doctor"
  | "limitation"
  | "describe"
  | "open"
  | "status"
  | "list"
  | "close"
  | "send"
  | "recv"
  | "pull"
  | "peers"
  | "attach"
  | "circuit";

export type StubOp =
  | "wireguard"
  | "wg"
  | "openvpn"
  | "ovpn"
  | "l3_exit"
  | "exit_pool"
  | "udp_listen"
  | "kernel_vpn"
  | "tun"
  | "tap"
  | "socks"
  | "tor"
  | "origin_hiding";

export type KindLabel =
  | "https_ws"
  | "fraggate_envelopes"
  | "websocket_attach"
  | "onion_circuit_layering"
  | "hybrid_pqc_handshake"
  | "rendezvous_join"
  | "wireguard"
  | "openvpn"
  | "l3_exit_pool"
  | "kernel_udp"
  | "tun_tap"
  | "socks"
  | "tor_public_network"
  | "origin_hiding";

export interface CircuitHop {
  role: HopRole;
  hop_id: string;
  handshake: "hybrid-x25519-mlkem768";
  honesty: "REAL";
}

export interface CircuitStatus {
  circuit_id: string;
  mode: SessionMode;
  hops: CircuitHop[];
  shape: string;
  rendezvous_cookie?: string;
  honesty: Honesty;
  note: string;
}

export interface Envelope {
  id: string;
  session_id: string;
  ciphertext_hex: string;
  layers: number;
  created_at: string;
}

export interface AzvpnError {
  ok: false;
  code: string;
  honesty?: Honesty;
  op?: string;
  note: string;
}
