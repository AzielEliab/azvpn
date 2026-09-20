import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AzvpnEngine } from "../src/engine.js";

describe("concentrator engine", () => {
  it("opens HTTP/WS lab, send/recv, attach, close", () => {
    const engine = new AzvpnEngine();
    const opened = engine.dispatch("open", { peer: "alice", mode: "http_ws" });
    assert.equal(opened.transport && (opened.transport as { tls: boolean }).tls, false);
    assert.equal(opened.ok, true);
    assert.equal(opened.honesty, "REAL");
    const id = opened.session_id as string;
    assert.equal(engine.dispatch("send", { session_id: id }).ok, false);
    const sent = engine.dispatch("send", { session_id: id, text: "ping" });
    assert.equal(sent.ok, true);
    const got = engine.dispatch("recv", { session_id: id }) as { envelopes: { text: string }[] };
    assert.equal(got.envelopes[0].text, "ping");
    const ticket = engine.dispatch("attach", { session_id: id });
    assert.equal(ticket.honesty, "REAL");
    assert.ok(typeof ticket.ticket === "string");
    assert.equal(engine.dispatch("close", { session_id: id }).ok, true);
    assert.equal(engine.dispatch("status", { session_id: id }).ok, false);
  });

  it("maps catalog https_ws alias to http_ws lab without TLS", () => {
    const engine = new AzvpnEngine();
    const aliased = engine.dispatch("open", { peer: "alias", mode: "https_ws" });
    assert.equal(aliased.ok, true);
    assert.equal(aliased.mode, "http_ws");
    assert.equal((aliased.transport as { tls: boolean }).tls, false);
  });

  it("opens onion session and peels on recv", () => {
    const engine = new AzvpnEngine();
    const opened = engine.dispatch("open", { peer: "bob", mode: "onion" });
    const id = opened.session_id as string;
    const circuit = opened.circuit as { shape: string; honesty: string };
    assert.equal(circuit.shape, "entry → middle → exit");
    engine.dispatch("send", { session_id: id, text: "layered" });
    const got = engine.dispatch("recv", { session_id: id }) as {
      envelopes: { text: string; peel: { role: string }[] }[];
    };
    assert.equal(got.envelopes[0].text, "layered");
    assert.deepEqual(
      got.envelopes[0].peel.map((p) => p.role),
      ["entry", "middle", "exit"],
    );
  });

  it("joins two rendezvous circuits by cookie", () => {
    const engine = new AzvpnEngine();
    const a = engine.dispatch("open", { peer: "a", mode: "rendezvous" });
    const cookie = (a.circuit as { rendezvous_cookie: string }).rendezvous_cookie;
    const b = engine.dispatch("open", { peer: "b", mode: "rendezvous", cookie });
    assert.equal((b.circuit as { rendezvous_cookie: string }).rendezvous_cookie, cookie);
    engine.dispatch("send", { session_id: a.session_id, text: "meet-here" });
    const got = engine.dispatch("recv", { session_id: b.session_id }) as { envelopes: { text: string }[] };
    assert.equal(got.envelopes[0].text, "meet-here");
  });

  it("GET-style health never opens a tunnel", () => {
    const engine = new AzvpnEngine();
    const before = engine.dispatch("health") as { open_tunnels: number };
    engine.dispatch("health");
    engine.dispatch("doctor");
    engine.dispatch("limitation");
    const after = engine.dispatch("health") as { open_tunnels: number };
    assert.equal(before.open_tunnels, 0);
    assert.equal(after.open_tunnels, 0);
  });
});
