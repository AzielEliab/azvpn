import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertBindPolicy, BindPolicyError, isLoopbackHost, tokenMatches } from "../src/bind.js";

describe("bind policy", () => {
  it("treats 127/8 and localhost as loopback", () => {
    assert.equal(isLoopbackHost("127.0.0.1"), true);
    assert.equal(isLoopbackHost("127.1.2.3"), true);
    assert.equal(isLoopbackHost("localhost"), true);
    assert.equal(isLoopbackHost("::1"), true);
    assert.equal(isLoopbackHost("::ffff:127.0.0.1"), true);
    assert.equal(isLoopbackHost("0.0.0.0"), false);
    assert.equal(isLoopbackHost("::"), false);
    assert.equal(isLoopbackHost("192.168.1.9"), false);
  });

  it("allows loopback without token", () => {
    const policy = assertBindPolicy({ host: "127.0.0.1" });
    assert.equal(policy.loopback, true);
    assert.equal(policy.auth_required, false);
    assert.equal(policy.tls, false);
    assert.equal(policy.transport, "http_ws");
    const tlsPolicy = assertBindPolicy({ host: "127.0.0.1", tls: true });
    assert.equal(tlsPolicy.tls, true);
    assert.equal(tlsPolicy.transport, "https_ws");
  });

  it("refuses non-loopback without explicit opt-in", () => {
    assert.throws(
      () => assertBindPolicy({ host: "0.0.0.0" }),
      (err: unknown) => err instanceof BindPolicyError && err.code === "AZVPN-BIND-REFUSED",
    );
  });

  it("refuses non-loopback opt-in without a strong token", () => {
    assert.throws(
      () => assertBindPolicy({ host: "0.0.0.0", exposeNonLoopback: true }),
      (err: unknown) => err instanceof BindPolicyError && err.code === "AZVPN-AUTH-REQUIRED",
    );
    assert.throws(
      () => assertBindPolicy({ host: "0.0.0.0", exposeNonLoopback: true, token: "short" }),
      (err: unknown) => err instanceof BindPolicyError && err.code === "AZVPN-AUTH-REQUIRED",
    );
  });

  it("allows non-loopback only with opt-in and token", () => {
    const policy = assertBindPolicy({
      host: "0.0.0.0",
      exposeNonLoopback: true,
      token: "sixteen-chars-ok",
    });
    assert.equal(policy.loopback, false);
    assert.equal(policy.auth_required, true);
    assert.ok(policy.danger);
    assert.equal(tokenMatches("sixteen-chars-ok", policy.token!), true);
    assert.equal(tokenMatches("wrong-token-here1", policy.token!), false);
  });
});
