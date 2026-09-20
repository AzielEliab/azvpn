import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fromUtf8, utf8 } from "../src/bytes.js";
import { buildCircuit, circuitStatus, defaultRelayRoster, peelAtHop, transit, wrapOnion } from "../src/onion.js";

describe("onion circuits", () => {
  it("peels entry → middle → exit to recover plaintext", () => {
    const circuit = buildCircuit(defaultRelayRoster(), "onion");
    assert.equal(circuit.hops.length, 3);
    assert.deepEqual(
      circuit.hops.map((h) => h.role),
      ["entry", "middle", "exit"],
    );
    const onion = wrapOnion(circuit, utf8("circuit-ok"));
    const first = peelAtHop(circuit.hops[0], onion);
    assert.equal(first.next, "middle.azvpn.local");
    const delivered = transit(circuit, onion);
    assert.equal(fromUtf8(delivered.plaintext), "circuit-ok");
    assert.equal(delivered.steps.length, 3);
    assert.equal(circuitStatus(circuit).shape, "entry → middle → exit");
    assert.equal(circuitStatus(circuit).honesty, "REAL");
    assert.match(circuitStatus(circuit).note, /SLOT/);
    assert.equal(circuitStatus(circuit).cell_padded, true);
    assert.equal(circuitStatus(circuit).cell_size, 512);
  });

  it("pads short payloads to a fixed cell so sizes match", () => {
    const circuit = buildCircuit(defaultRelayRoster(), "onion");
    const a = wrapOnion(circuit, utf8("a"));
    const b = wrapOnion(circuit, utf8("bb"));
    assert.equal(a.length, b.length);
    assert.equal(fromUtf8(transit(circuit, a).plaintext), "a");
    assert.equal(fromUtf8(transit(circuit, b).plaintext), "bb");
    assert.match(circuitStatus(circuit).note, /not origin-hiding/i);
  });

  it("builds rendezvous shape without claiming public Tor", () => {
    const circuit = buildCircuit(defaultRelayRoster(), "rendezvous");
    assert.equal(circuitStatus(circuit).shape, "entry → middle → rendezvous");
    assert.ok(circuit.rendezvous_cookie);
    const delivered = transit(circuit, wrapOnion(circuit, utf8("meet")));
    assert.equal(fromUtf8(delivered.plaintext), "meet");
  });
});
