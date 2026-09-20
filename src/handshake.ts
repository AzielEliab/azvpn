import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { concat, fromHex, toHex, utf8 } from "./bytes.js";

export const HANDSHAKE = "hybrid-x25519-mlkem768" as const;
export const HKDF_SALT = "AZVPN-HYBRID-PQC-1.0";
export const HKDF_INFO = "azvpn-hop-key";

export interface HopIdentity {
  hop_id: string;
  x25519_public_hex: string;
  x25519_secret_hex: string;
  mlkem_public_hex: string;
  mlkem_secret_hex: string;
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
}

export function generateHopIdentity(hop_id: string): HopIdentity {
  const xSecret = x25519.utils.randomPrivateKey();
  const xPublic = x25519.getPublicKey(xSecret);
  const kem = ml_kem768.keygen();
  return {
    hop_id,
    x25519_public_hex: toHex(xPublic),
    x25519_secret_hex: toHex(xSecret),
    mlkem_public_hex: toHex(kem.publicKey),
    mlkem_secret_hex: toHex(kem.secretKey),
  };
}

function combine(xShared: Uint8Array, kemShared: Uint8Array): Uint8Array {
  return hkdf(sha256, concat(xShared, kemShared), utf8(HKDF_SALT), utf8(HKDF_INFO), 32);
}

export function hybridHandshake(remote: HopIdentity): HandshakeResult {
  const ephSecret = x25519.utils.randomPrivateKey();
  const ephPublic = x25519.getPublicKey(ephSecret);
  const xShared = x25519.getSharedSecret(ephSecret, fromHex(remote.x25519_public_hex));
  const encapsulated = ml_kem768.encapsulate(fromHex(remote.mlkem_public_hex));
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
  };
}

export function acceptHandshake(local: HopIdentity, offer: HandshakeOffer): Uint8Array {
  const xShared = x25519.getSharedSecret(
    fromHex(local.x25519_secret_hex),
    fromHex(offer.x25519_ephemeral_public_hex),
  );
  const kemShared = ml_kem768.decapsulate(
    fromHex(offer.mlkem_ciphertext_hex),
    fromHex(local.mlkem_secret_hex),
  );
  return combine(xShared, kemShared);
}

export function refuseX25519Only(): { ok: false; code: string; residual: "NOT_QUANTUM_PROOF"; note: string } {
  return {
    ok: false,
    code: "AZVPN-NOT-QUANTUM-PROOF",
    residual: "NOT_QUANTUM_PROOF",
    note: "X25519-only handshake is refused. Designed path is hybrid X25519 + ML-KEM-768.",
  };
}
