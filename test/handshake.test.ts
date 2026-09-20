import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toHex } from "../src/bytes.js";
import { AzvpnEngine } from "../src/engine.js";
import { acceptHandshake, generateHopIdentity, hybridHandshake, refuseX25519Only } from "../src/handshake.js";

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
  });

  it("refuses X25519-only", () => {
    const refused = refuseX25519Only();
    assert.equal(refused.ok, false);
    assert.equal(refused.residual, "NOT_QUANTUM_PROOF");
    assert.equal(new AzvpnEngine().dispatch("x25519_only").code, "AZVPN-NOT-QUANTUM-PROOF");
  });
});
