import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AzvpnEngine } from "../src/engine.js";
import { listen } from "../src/server.js";

describe("HTTP/WS concentrator", () => {
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
});
