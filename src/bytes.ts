import { randomBytes as nobleRandom } from "@noble/hashes/utils.js";

export function randomBytes(n: number): Uint8Array {
  return nobleRandom(n);
}

export function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function fromHex(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("AZVPN-BAD-HEX");
  }
  return new Uint8Array(Buffer.from(hex, "hex"));
}

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function fromUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function id(prefix: string, bytes = 16): string {
  return `${prefix}_${toHex(randomBytes(bytes))}`;
}
