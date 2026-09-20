import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { fromHex, randomBytes, toHex } from "./bytes.js";

const NONCE_LEN = 24;

export function seal(key: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array): string {
  if (key.length !== 32) throw new Error("AZVPN-BAD-KEY");
  const nonce = randomBytes(NONCE_LEN);
  const cipher = xchacha20poly1305(key, nonce, aad);
  const ct = cipher.encrypt(plaintext);
  return `${toHex(nonce)}.${toHex(ct)}`;
}

export function open(key: Uint8Array, packed: string, aad?: Uint8Array): Uint8Array {
  if (key.length !== 32) throw new Error("AZVPN-BAD-KEY");
  const [nonceHex, ctHex] = packed.split(".");
  if (!nonceHex || !ctHex) throw new Error("AZVPN-BAD-SEAL");
  const nonce = fromHex(nonceHex);
  const ct = fromHex(ctHex);
  if (nonce.length !== NONCE_LEN) throw new Error("AZVPN-BAD-NONCE");
  const cipher = xchacha20poly1305(key, nonce, aad);
  return cipher.decrypt(ct);
}
