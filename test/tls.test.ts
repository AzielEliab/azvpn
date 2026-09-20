import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { generateLabCertificate, resolveTlsRequest, TlsPolicyError, writeLabCertificate } from "../src/tls.js";

describe("TLS material", () => {
  it("generates a parseable lab certificate", () => {
    const { certPem, keyPem } = generateLabCertificate("127.0.0.1");
    const parsed = new X509Certificate(certPem);
    assert.match(parsed.subject, /127\.0\.0\.1/);
    assert.match(keyPem, /BEGIN/);
  });

  it("fail-closes when --tls is set without files", () => {
    assert.throws(
      () => resolveTlsRequest({ tls: true }),
      (err: unknown) => err instanceof TlsPolicyError && err.code === "AZVPN-TLS-REQUIRED",
    );
    assert.deepEqual(resolveTlsRequest({ tls: false }), { enabled: false });
  });

  it("loads written lab certs", () => {
    const dir = mkdtempSync(join(tmpdir(), "azvpn-cert-"));
    const written = writeLabCertificate(dir);
    const loaded = resolveTlsRequest({ tls: true, certPath: written.certPath, keyPath: written.keyPath });
    assert.equal(loaded.enabled, true);
  });
});
