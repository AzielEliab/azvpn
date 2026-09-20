import { execFileSync } from "node:child_process";
import {
  createSign,
  generateKeyPairSync,
  randomBytes,
  X509Certificate,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export class TlsPolicyError extends Error {
  readonly code: string;
  readonly honesty = "SLOT" as const;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TlsPolicyError";
    this.code = code;
  }

  toJSON() {
    return { ok: false as const, code: this.code, honesty: this.honesty, note: this.message };
  }
}

export interface TlsRequest {
  tls?: boolean;
  certPath?: string;
  keyPath?: string;
}

export type TlsMaterial =
  | { enabled: false }
  | { enabled: true; cert: string; key: string; certPath: string; keyPath: string };

export function envFlag(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function resolveTlsRequest(req: TlsRequest = {}): TlsMaterial {
  const wanted = Boolean(req.tls);
  if (!wanted) return { enabled: false };
  const certPath = (req.certPath ?? process.env.AZVPN_TLS_CERT ?? "").trim();
  const keyPath = (req.keyPath ?? process.env.AZVPN_TLS_KEY ?? "").trim();
  if (!certPath || !keyPath) {
    throw new TlsPolicyError(
      "AZVPN-TLS-REQUIRED",
      "--tls fail-closed: cert and key are required (--tls-cert/--tls-key or AZVPN_TLS_CERT/AZVPN_TLS_KEY). ACME is SLOT. Default listen stays loopback HTTP lab.",
    );
  }
  if (!existsSync(certPath) || !existsSync(keyPath)) {
    throw new TlsPolicyError(
      "AZVPN-TLS-REQUIRED",
      `--tls fail-closed: cert or key file missing (${certPath} / ${keyPath}). Generate a lab cert with azvpn cert. ACME is SLOT.`,
    );
  }
  let cert: string;
  let key: string;
  try {
    cert = readFileSync(certPath, "utf8");
    key = readFileSync(keyPath, "utf8");
  } catch {
    throw new TlsPolicyError(
      "AZVPN-TLS-REQUIRED",
      "--tls fail-closed: cert/key unreadable. ACME is SLOT.",
    );
  }
  if (!cert.includes("BEGIN") || !key.includes("BEGIN")) {
    throw new TlsPolicyError(
      "AZVPN-TLS-REQUIRED",
      "--tls fail-closed: cert/key must be PEM. ACME is SLOT.",
    );
  }
  try {
    void new X509Certificate(cert);
  } catch {
    throw new TlsPolicyError(
      "AZVPN-TLS-REQUIRED",
      "--tls fail-closed: certificate PEM did not parse. ACME is SLOT.",
    );
  }
  return { enabled: true, cert, key, certPath: resolve(certPath), keyPath: resolve(keyPath) };
}

function derLen(n: number): Buffer {
  if (n < 128) return Buffer.from([n]);
  if (n < 256) return Buffer.from([0x81, n]);
  if (n < 65536) return Buffer.from([0x82, (n >> 8) & 0xff, n & 0xff]);
  throw new Error("AZVPN-DER-TOO-LONG");
}

function tlv(tag: number, body: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLen(body.length), body]);
}

function oid(dotted: string): Buffer {
  const n = dotted.split(".").map((x) => Number(x));
  const bytes: number[] = [40 * n[0] + n[1]];
  for (const part of n.slice(2)) {
    const stack: number[] = [];
    let v = part;
    stack.push(v & 0x7f);
    v >>= 7;
    while (v > 0) {
      stack.push((v & 0x7f) | 0x80);
      v >>= 7;
    }
    for (let i = stack.length - 1; i >= 0; i -= 1) bytes.push(stack[i]);
  }
  return tlv(0x06, Buffer.from(bytes));
}

function integer(value: Buffer): Buffer {
  let v = value;
  while (v.length > 1 && v[0] === 0x00 && (v[1] & 0x80) === 0) v = v.subarray(1);
  if (v[0] & 0x80) v = Buffer.concat([Buffer.from([0x00]), v]);
  return tlv(0x02, v);
}

function utf8Str(s: string): Buffer {
  return tlv(0x0c, Buffer.from(s, "utf8"));
}

function utcTime(d: Date): Buffer {
  const yy = String(d.getUTCFullYear() % 100).padStart(2, "0");
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return tlv(0x17, Buffer.from(`${yy}${mo}${da}${hh}${mi}${ss}Z`, "ascii"));
}

function rdn(cn: string, org: string): Buffer {
  const cnAttr = tlv(0x30, Buffer.concat([oid("2.5.4.3"), utf8Str(cn)]));
  const orgAttr = tlv(0x30, Buffer.concat([oid("2.5.4.10"), utf8Str(org)]));
  return tlv(0x30, Buffer.concat([tlv(0x31, cnAttr), tlv(0x31, orgAttr)]));
}

function sha256WithRSA(): Buffer {
  return tlv(0x30, Buffer.concat([oid("1.2.840.113549.1.1.11"), tlv(0x05, Buffer.alloc(0))]));
}

function bitString(bytes: Buffer): Buffer {
  return tlv(0x03, Buffer.concat([Buffer.from([0x00]), bytes]));
}

function pemWrap(type: string, der: Buffer): string {
  const b64 = der.toString("base64");
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----\n`;
}

/** In-process RSA lab certificate. Not ACME. Not a public CA. Node TLS remains classical (HN-DR). */
export function generateLabCertificate(cn = "127.0.0.1"): { certPem: string; keyPem: string; cn: string } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const now = new Date();
  const notBefore = new Date(now.getTime() - 60_000);
  const notAfter = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const serial = integer(randomBytes(8));
  const subject = rdn(cn, "AZVPN Lab");
  const validity = tlv(0x30, Buffer.concat([utcTime(notBefore), utcTime(notAfter)]));
  const tbs = tlv(0x30, Buffer.concat([serial, sha256WithRSA(), subject, validity, subject, spki]));
  const signer = createSign("SHA256");
  signer.update(tbs);
  signer.end();
  const sig = signer.sign(privateKey);
  const certDer = tlv(0x30, Buffer.concat([tbs, sha256WithRSA(), bitString(sig)]));
  const certPem = pemWrap("CERTIFICATE", certDer);
  const keyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  void new X509Certificate(certPem);
  return { certPem, keyPem, cn };
}

export function writeLabCertificate(dir: string, cn = "127.0.0.1"): { certPath: string; keyPath: string; cn: string } {
  const out = resolve(dir);
  mkdirSync(out, { recursive: true });
  const certPath = join(out, "cert.pem");
  const keyPath = join(out, "key.pem");
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "30",
        "-nodes",
        "-subj",
        `/CN=${cn}/O=AZVPN Lab`,
      ],
      { stdio: "ignore" },
    );
    return { certPath, keyPath, cn };
  } catch {
    const generated = generateLabCertificate(cn);
    writeFileSync(certPath, generated.certPem, { mode: 0o644 });
    writeFileSync(keyPath, generated.keyPem, { mode: 0o600 });
    return { certPath, keyPath, cn };
  }
}
