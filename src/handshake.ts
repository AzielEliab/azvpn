import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { concat, fromHex, toHex, utf8, wipeBytes } from "./bytes.js";

export const HANDSHAKE = "hybrid-x25519-mlkem768" as const;
export const HKDF_SALT = "AZVPN-HYBRID-PQC-1.0";
export const HKDF_INFO = "azvpn-hop-key";

/** ML-KEM-768 sizes (FIPS 203). Fail closed if a hop omits them. */
export const MLKEM768_PUBLIC_BYTES = 1184;
export const MLKEM768_SECRET_BYTES = 2400;
export const MLKEM768_CIPHERTEXT_BYTES = 1088;
export const X25519_BYTES = 32;
export const HOP_KEY_BYTES = 32;

export class HandshakeRefuseError extends Error {
  readonly code = "AZVPN-NOT-QUANTUM-PROOF";
  readonly residual = "NOT_QUANTUM_PROOF" as const;

  constructor(message: string) {
    super(message);
    this.name = "HandshakeRefuseError";
  }

  toJSON() {
    return refuseClassicalOnly(this.message);
  }
}

export interface HopIdentity {
  hop_id: string;
  x25519_public_hex: string;
  x25519_secret_hex: string;
  mlkem_public_hex: string;
  mlkem_secret_hex: string;
}

export interface HopPublic {
  hop_id?: string;
  x25519_public_hex: string;
  mlkem_public_hex: string;
}

export interface HandshakeOffer {
  handshake: typeof HANDSHAKE;
  honesty: "REAL";
  x25519_ephemeral_public_hex: string;
  mlkem_ciphertext_hex: string;
}

export interface HandshakeResult {
  handshake: typeof HANDSHAKE;
  honesty: "REAL";
  key: Uint8Array;
  offer: HandshakeOffer;
  residuals: ["NOT_QUANTUM_PROOF"];
  wiped_ephemeral: true;
}

export function refuseClassicalOnly(
  note = "Classical-only handshake refused. Every hop key requires hybrid X25519 + ML-KEM-768. No silent downgrade.",
): { ok: false; code: string; residual: "NOT_QUANTUM_PROOF"; note: string } {
  return {
    ok: false,
    code: "AZVPN-NOT-QUANTUM-PROOF",
    residual: "NOT_QUANTUM_PROOF",
    note,
  };
}

export function refuseX25519Only(): { ok: false; code: string; residual: "NOT_QUANTUM_PROOF"; note: string } {
  return refuseClassicalOnly(
    "X25519-only handshake is refused. Designed path is hybrid X25519 + ML-KEM-768. No silent downgrade.",
  );
}

function hexLen(hex: string | undefined): number {
  if (!hex || typeof hex !== "string") return 0;
  try {
    return fromHex(hex).length;
  } catch {
    return 0;
  }
}

export function assertHopPublic(hop: HopPublic): void {
  if (hexLen(hop.x25519_public_hex) !== X25519_BYTES || hexLen(hop.mlkem_public_hex) !== MLKEM768_PUBLIC_BYTES) {
    throw new HandshakeRefuseError(
      "Hop public material is not hybrid X25519 + ML-KEM-768. Classical-only / missing ML-KEM is refused.",
    );
  }
}

export function assertHopIdentity(hop: HopIdentity): void {
  assertHopPublic(hop);
  if (hexLen(hop.x25519_secret_hex) !== X25519_BYTES || hexLen(hop.mlkem_secret_hex) !== MLKEM768_SECRET_BYTES) {
    throw new HandshakeRefuseError(
      "Hop secret material is not hybrid X25519 + ML-KEM-768. Classical-only / missing ML-KEM is refused.",
    );
  }
}

export function assertHybridOffer(offer: HandshakeOffer | Record<string, unknown>): HandshakeOffer {
  const handshake = offer.handshake;
  const xHex = offer.x25519_ephemeral_public_hex;
  const cHex = offer.mlkem_ciphertext_hex;
  if (
    handshake !== HANDSHAKE ||
    typeof xHex !== "string" ||
    typeof cHex !== "string" ||
    hexLen(xHex) !== X25519_BYTES ||
    hexLen(cHex) !== MLKEM768_CIPHERTEXT_BYTES
  ) {
    throw new HandshakeRefuseError(
      "Handshake offer is not hybrid X25519 + ML-KEM-768. Classical-only and silent downgrade are refused.",
    );
  }
  return {
    handshake: HANDSHAKE,
    honesty: "REAL",
    x25519_ephemeral_public_hex: xHex,
    mlkem_ciphertext_hex: cHex,
  };
}

export function generateHopIdentity(hop_id: string): HopIdentity {
  const xSecret = x25519.utils.randomPrivateKey();
  const xPublic = x25519.getPublicKey(xSecret);
  const kem = ml_kem768.keygen();
  const identity: HopIdentity = {
    hop_id,
    x25519_public_hex: toHex(xPublic),
    x25519_secret_hex: toHex(xSecret),
    mlkem_public_hex: toHex(kem.publicKey),
    mlkem_secret_hex: toHex(kem.secretKey),
  };
  assertHopIdentity(identity);
  return identity;
}

function combine(xShared: Uint8Array, kemShared: Uint8Array): Uint8Array {
  if (xShared.length !== HOP_KEY_BYTES || kemShared.length !== HOP_KEY_BYTES) {
    throw new HandshakeRefuseError(
      "Hybrid IKM incomplete. Both X25519 and ML-KEM-768 shared secrets are required. No silent downgrade.",
    );
  }
  const ikm = concat(xShared, kemShared);
  try {
    return hkdf(sha256, ikm, utf8(HKDF_SALT), utf8(HKDF_INFO), HOP_KEY_BYTES);
  } finally {
    wipeBytes(ikm);
  }
}

export function hybridHandshake(remote: HopPublic): HandshakeResult {
  assertHopPublic(remote);
  const ephSecret = x25519.utils.randomPrivateKey();
  const ephPublic = x25519.getPublicKey(ephSecret);
  const remoteX = fromHex(remote.x25519_public_hex);
  const remoteKem = fromHex(remote.mlkem_public_hex);
  let xShared: Uint8Array | undefined;
  let encapsulated: { cipherText: Uint8Array; sharedSecret: Uint8Array } | undefined;
  try {
    xShared = x25519.getSharedSecret(ephSecret, remoteX);
    encapsulated = ml_kem768.encapsulate(remoteKem);
    const key = combine(xShared, encapsulated.sharedSecret);
    return {
      handshake: HANDSHAKE,
      honesty: "REAL",
      key,
      offer: {
        handshake: HANDSHAKE,
        honesty: "REAL",
        x25519_ephemeral_public_hex: toHex(ephPublic),
        mlkem_ciphertext_hex: toHex(encapsulated.cipherText),
      },
      residuals: ["NOT_QUANTUM_PROOF"],
      wiped_ephemeral: true,
    };
  } finally {
    wipeBytes(ephSecret, xShared, encapsulated?.sharedSecret);
  }
}

export function acceptHandshake(local: HopIdentity, offer: HandshakeOffer): Uint8Array {
  assertHopIdentity(local);
  const hybrid = assertHybridOffer(offer);
  const ephPub = fromHex(hybrid.x25519_ephemeral_public_hex);
  const ct = fromHex(hybrid.mlkem_ciphertext_hex);
  const xSec = fromHex(local.x25519_secret_hex);
  const kemSec = fromHex(local.mlkem_secret_hex);
  let xShared: Uint8Array | undefined;
  let kemShared: Uint8Array | undefined;
  try {
    xShared = x25519.getSharedSecret(xSec, ephPub);
    kemShared = ml_kem768.decapsulate(ct, kemSec);
    return combine(xShared, kemShared);
  } finally {
    wipeBytes(xShared, kemShared, xSec, kemSec);
  }
}
