import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AzvpnEngine } from "../src/engine.js";
import { honestyBanner, KINDS, LIMITATION, residualsFor, STUB_OPS } from "../src/honesty.js";

describe("honesty matrix", () => {
  it("labels HTTP/WS lab and onion layering REAL", () => {
    assert.equal(KINDS.http_ws, "REAL");
    assert.equal(KINDS.websocket_attach, "REAL");
    assert.equal(KINDS.onion_circuit_layering, "REAL");
    assert.equal(KINDS.hybrid_pqc_handshake, "REAL");
    assert.equal(KINDS.rendezvous_join, "REAL");
  });

  it("does not claim HTTPS/TLS on this process unless TLS terminates", () => {
    assert.equal(KINDS.https_tls, "SLOT");
    assert.equal(KINDS.https_ws, "SLOT");
    assert.match(LIMITATION, /not TLS/i);
    assert.doesNotMatch(LIMITATION, /HTTPS\/WS, encrypted/);
    const on = honestyBanner({ tls_terminated: true });
    assert.equal(on.kinds.https_tls, "REAL");
    assert.equal(on.kinds.https_ws, "REAL");
    assert.equal(on.transport.tls, true);
    assert.equal(on.transport.acme, "SLOT");
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
    const notes = residualsFor().map((r) => r.note).join("\n");
    assert.match(notes, /HN-DR|Harvest-Now-Decrypt-Later/);
    assert.match(notes, /Grover/);
    assert.match(notes, /Host metadata/);
    assert.match(notes, /side-channel/);
    assert.equal(banner.lumen.private_canon_in_this_repo, false);
    assert.equal(banner.transport.tls, false);
    assert.equal(banner.transport.acme, "SLOT");
  });
});
