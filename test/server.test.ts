import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import https from "node:https";
import { BindPolicyError } from "../src/bind.js";
import { AzvpnEngine } from "../src/engine.js";
import { listen } from "../src/server.js";
import { TlsPolicyError, writeLabCertificate } from "../src/tls.js";

describe("HTTP/WS concentrator", () => {
  it("refuses non-loopback listen without opt-in and token", async () => {
    await assert.rejects(
      () => listen({ host: "0.0.0.0", port: 0, engine: new AzvpnEngine() }),
      (err: unknown) => err instanceof BindPolicyError && err.code === "AZVPN-BIND-REFUSED",
    );
    await assert.rejects(
      () => listen({ host: "0.0.0.0", port: 0, exposeNonLoopback: true, engine: new AzvpnEngine() }),
      (err: unknown) => err instanceof BindPolicyError && err.code === "AZVPN-AUTH-REQUIRED",
    );
  });

  it("requires bearer token when a token is configured", async () => {
    const token = "loopback-token-16";
    const srv = await listen({ host: "127.0.0.1", port: 0, engine: new AzvpnEngine(), token });
    const base = `http://127.0.0.1:${srv.port}`;
    const denied = await fetch(`${base}/v1/health`);
    assert.equal(denied.status, 401);
    const ok = await fetch(`${base}/v1/health`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(ok.status, 200);
    await srv.close();
  });

  it("serves UI, health, open, and refuses SLOT", async () => {
    const engine = new AzvpnEngine();
    const srv = await listen({ host: "127.0.0.1", port: 0, engine });
    const address = (srv as unknown as { port: number }).port;
    // Node may assign 0; read from engine via fetch using the returned port.
    const base = `http://127.0.0.1:${address}`;
    const ui = await fetch(`${base}/`);
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /AZVPN/);
    const health = await fetch(`${base}/v1/health`);
    const healthJson = (await health.json()) as { ok: boolean; open_tunnels: number };
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.open_tunnels, 0);
    const opened = await fetch(`${base}/v1/open`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ peer: "web", mode: "onion" }),
    });
    const session = (await opened.json()) as { session_id: string; circuit: { shape: string } };
    assert.equal(session.circuit.shape, "entry → middle → exit");
    const slot = await fetch(`${base}/v1/wireguard`, { method: "POST", body: "{}" });
    const slotJson = (await slot.json()) as { code: string; honesty: string };
    assert.equal(slotJson.code, "AZVPN-SLOT");
    assert.equal(slotJson.honesty, "SLOT");
    await srv.close();
  });

  it("fail-closes --tls without cert/key", async () => {
    await assert.rejects(
      () => listen({ host: "127.0.0.1", port: 0, engine: new AzvpnEngine(), tls: true }),
      (err: unknown) => err instanceof TlsPolicyError && err.code === "AZVPN-TLS-REQUIRED",
    );
  });

  it("terminates HTTPS when cert/key are present", async () => {
    const dir = mkdtempSync(join(tmpdir(), "azvpn-tls-"));
    const written = writeLabCertificate(dir);
    const engine = new AzvpnEngine();
    const srv = await listen({
      host: "127.0.0.1",
      port: 0,
      engine,
      tls: true,
      tlsCert: written.certPath,
      tlsKey: written.keyPath,
    });
    assert.equal(srv.tls.enabled, true);
    assert.equal(srv.policy.tls, true);
    const body = await httpsJson(`https://127.0.0.1:${srv.port}/v1/health`);
    assert.equal(body.ok, true);
    assert.equal((body.transport as { tls: boolean }).tls, true);
    assert.equal((body.kinds as { https_tls: string }).https_tls, "REAL");
    assert.equal((body.kinds as { https_ws: string }).https_ws, "REAL");
    await srv.close();
  });
});

function httpsJson(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}
