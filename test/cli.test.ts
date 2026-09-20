import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { main } from "../src/cli.js";

function capture(fn: () => Promise<number>): Promise<{ code: number; stdout: string }> {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
    return true;
  }) as typeof process.stdout.write;
  return fn().then((code) => {
    process.stdout.write = orig;
    return { code, stdout: chunks.join("") };
  }, (err) => {
    process.stdout.write = orig;
    throw err;
  });
}

describe("CLI", () => {
  it("prints help and doctor", async () => {
    const help = await capture(() => main(["help"]));
    assert.equal(help.code, 0);
    assert.match(help.stdout, /SLOT/);
    assert.match(help.stdout, /HTTP\/WS lab/);
    assert.match(help.stdout, /expose-non-loopback/);
    const refused = await capture(() => main(["serve", "--host", "0.0.0.0"]));
    assert.equal(refused.code, 2);
    assert.match(refused.stdout, /AZVPN-BIND-REFUSED/);
    const dir = mkdtempSync(join(tmpdir(), "azvpn-"));
    const state = join(dir, "state.json");
    writeFileSync(state, "");
    const doctor = await capture(() => main(["doctor", "--state", state]));
    assert.equal(doctor.code, 0);
    assert.match(doctor.stdout, /onion_circuit_layering/);
    const open = await capture(() => main(["open", "--state", state, "--peer", "cli", "--mode", "onion"]));
    assert.equal(open.code, 0);
    const session = JSON.parse(open.stdout) as { session_id: string };
    const send = await capture(() =>
      main(["send", "--state", state, "--id", session.session_id, "--text", "from-cli"]),
    );
    assert.equal(send.code, 0);
    const recv = await capture(() => main(["recv", "--state", state, "--id", session.session_id]));
    assert.match(recv.stdout, /from-cli/);
  });
});
