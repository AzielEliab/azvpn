import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toHex } from "../src/bytes.js";
import { AzvpnEngine } from "../src/engine.js";
import { wipeBytes } from "../src/bytes.js";
import {
  acceptHandshake,
  assertHopPublic,
  generateHopIdentity,
  HandshakeRefuseError,
  hybridHandshake,
  refuseClassicalOnly,
  refuseX25519Only,
} from "../src/handshake.js";

describe("hybrid PQC handshake", () => {
  it("agrees on HKDF(X25519 || ML-KEM-768)", () => {
    const hop = generateHopIdentity("middle.azvpn.local");
    const client = hybridHandshake(hop);
    const server = acceptHandshake(hop, client.offer);
    assert.equal(toHex(client.key), toHex(server));
    assert.equal(client.handshake, "hybrid-x25519-mlkem768");
    assert.equal(client.honesty, "REAL");
    assert.deepEqual(client.residuals, ["NOT_QUANTUM_PROOF"]);
    assert.equal(client.key.length, 32);
    assert.equal(client.wiped_ephemeral, true);
  });

  it("refuses X25519-only and any classical-only hop", () => {
    const refused = refuseX25519Only();
    assert.equal(refused.ok, false);
    assert.equal(refused.residual, "NOT_QUANTUM_PROOF");
    assert.equal(new AzvpnEngine().dispatch("x25519_only").code, "AZVPN-NOT-QUANTUM-PROOF");
    assert.equal(new AzvpnEngine().dispatch("classical_only").code, "AZVPN-NOT-QUANTUM-PROOF");
    assert.equal(refuseClassicalOnly().code, "AZVPN-NOT-QUANTUM-PROOF");
    const classical = { hop_id: "bad", x25519_public_hex: "aa".repeat(32), mlkem_public_hex: "" };
    assert.throws(
      () => assertHopPublic(classical),
      (err: unknown) => err instanceof HandshakeRefuseError,
    );
    const hop = generateHopIdentity("middle.azvpn.local");
    const client = hybridHandshake(hop);
    assert.throws(
      () =>
        acceptHandshake(hop, {
          ...client.offer,
          handshake: "hybrid-x25519-mlkem768",
          mlkem_ciphertext_hex: "",
        }),
      (err: unknown) => err instanceof HandshakeRefuseError,
    );
  });

  it("wipes held buffers", () => {
    const buf = new Uint8Array([1, 2, 3, 4]);
    wipeBytes(buf);
    assert.deepEqual([...buf], [0, 0, 0, 0]);
  });
});
