import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AzvpnEngine } from "../src/engine.js";
import { honestyBanner, KINDS, STUB_OPS } from "../src/honesty.js";

describe("honesty matrix", () => {
  it("labels HTTPS/WS and onion layering REAL", () => {
    assert.equal(KINDS.https_ws, "REAL");
    assert.equal(KINDS.websocket_attach, "REAL");
    assert.equal(KINDS.onion_circuit_layering, "REAL");
    assert.equal(KINDS.hybrid_pqc_handshake, "REAL");
    assert.equal(KINDS.rendezvous_join, "REAL");
  });

  it("labels kernel VPN and public Tor SLOT", () => {
    assert.equal(KINDS.wireguard, "SLOT");
    assert.equal(KINDS.openvpn, "SLOT");
    assert.equal(KINDS.l3_exit_pool, "SLOT");
    assert.equal(KINDS.tor_public_network, "SLOT");
    assert.equal(KINDS.origin_hiding, "SLOT");
    assert.equal(KINDS.socks, "SLOT");
  });

  it("refuses SLOT ops and does not claim untraceable", () => {
    const engine = new AzvpnEngine();
    for (const op of STUB_OPS) {
      const out = engine.dispatch(op);
      assert.equal(out.ok, false);
      assert.equal(out.code, "AZVPN-SLOT");
      assert.equal(out.honesty, "SLOT");
    }
    const banner = honestyBanner();
    assert.ok(banner.claims_refused.includes("untraceable proven"));
    assert.ok(banner.residuals.every((r) => r.residual === "NOT_QUANTUM_PROOF"));
    assert.equal(banner.lumen.private_canon_in_this_repo, false);
  });
});
