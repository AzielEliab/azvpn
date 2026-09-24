import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { main } from "../src/cli.js";
import { uiHtml } from "../src/ui-html.js";

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
  it("welcomes people and keeps --help short", async () => {
    const bare = await capture(() => main([]));
    assert.equal(bare.code, 0);
    assert.match(bare.stdout, /azvpn ui/);
    assert.match(bare.stdout, /azvpn health/);
    assert.doesNotMatch(bare.stdout, /^\s*\{/);
    assert.doesNotMatch(bare.stdout, /THIS IS NOT/);

    const help = await capture(() => main(["--help"]));
    assert.equal(help.code, 0);
    assert.match(help.stdout, /Common commands:/);
    assert.match(help.stdout, /azvpn ui/);
    assert.match(help.stdout, /Examples:/);
    assert.doesNotMatch(help.stdout, /HN-DR/);
    assert.doesNotMatch(help.stdout, /THIS IS NOT/);

    const dashH = await capture(() => main(["-h"]));
    assert.match(dashH.stdout, /Common commands:/);

    const advanced = await capture(() => main(["help", "advanced"]));
    assert.equal(advanced.code, 0);
    assert.match(advanced.stdout, /SLOT/);
    assert.match(advanced.stdout, /HTTP\/WS lab/);
    assert.match(advanced.stdout, /expose-non-loopback/);
    assert.match(advanced.stdout, /--tls/);
    assert.match(advanced.stdout, /HN-DR/);
  });

  it("explains a bad command and still emits machine JSON", async () => {
    const human = await capture(() => main(["bogus"]));
    assert.equal(human.code, 2);
    assert.match(human.stdout, /Unknown command "bogus"/);
    assert.match(human.stdout, /azvpn --help/);
    assert.doesNotMatch(human.stdout, /^\s*\{/);

    const machine = await capture(() => main(["--json", "bogus"]));
    assert.equal(machine.code, 2);
    const body = JSON.parse(machine.stdout) as { ok: boolean; code: string; note: string };
    assert.equal(body.ok, false);
    assert.equal(body.code, "AZVPN-UNKNOWN-OP");
    assert.match(body.note, /Unknown op bogus/);
  });

  it("refuses TLS and non-loopback in plain language and in JSON", async () => {
    const tlsRefused = await capture(() => main(["serve", "--tls"]));
    assert.equal(tlsRefused.code, 2);
    assert.match(tlsRefused.stdout, /certificate and a key/);
    assert.match(tlsRefused.stdout, /AZVPN-TLS-REQUIRED/);
    assert.match(tlsRefused.stdout, /azvpn cert/);

    const tlsJson = await capture(() => main(["--json", "serve", "--tls"]));
    assert.equal(tlsJson.code, 2);
    const tlsBody = JSON.parse(tlsJson.stdout) as { ok: boolean; code: string; honesty: string };
    assert.equal(tlsBody.ok, false);
    assert.equal(tlsBody.code, "AZVPN-TLS-REQUIRED");
    assert.equal(tlsBody.honesty, "SLOT");

    const refused = await capture(() => main(["serve", "--host", "0.0.0.0"]));
    assert.equal(refused.code, 2);
    assert.match(refused.stdout, /AZVPN-BIND-REFUSED/);
    assert.match(refused.stdout, /127\.0\.0\.1/);

    const refusedJson = await capture(() => main(["--json", "ui", "--host", "0.0.0.0"]));
    const bindBody = JSON.parse(refusedJson.stdout) as { code: string; note: string };
    assert.equal(bindBody.code, "AZVPN-BIND-REFUSED");
    assert.match(bindBody.note, /expose-non-loopback/);
  });

  it("prints doctor, sessions, and certificates for people and machines", async () => {
    const dir = mkdtempSync(join(tmpdir(), "azvpn-"));
    const state = join(dir, "state.json");
    writeFileSync(state, "");

    const doctor = await capture(() => main(["doctor", "--state", state]));
    assert.equal(doctor.code, 0);
    assert.match(doctor.stdout, /Onion circuits in this process/);
    assert.match(doctor.stdout, /slot/);
    assert.doesNotMatch(doctor.stdout, /"onion_circuit_layering"/);

    const doctorJson = await capture(() => main(["--json", "doctor", "--state", state]));
    const doctorBody = JSON.parse(doctorJson.stdout) as { matrix: { onion_circuit_layering: string } };
    assert.equal(doctorBody.matrix.onion_circuit_layering, "REAL");

    const open = await capture(() => main(["open", "--state", state, "--peer", "cli", "--mode", "onion"]));
    assert.equal(open.code, 0);
    assert.match(open.stdout, /Session opened/);
    const sessionId = open.stdout.match(/sess_[0-9a-f]+/)?.[0];
    assert.ok(sessionId);

    const openJson = await capture(() => main(["--json", "open", "--state", state, "--peer", "cli-json", "--mode", "onion"]));
    const session = JSON.parse(openJson.stdout) as { ok: boolean; session_id: string; honesty: string; circuit: { shape: string } };
    assert.equal(session.ok, true);
    assert.equal(session.honesty, "REAL");
    assert.equal(session.circuit.shape, "entry → middle → exit");

    const send = await capture(() =>
      main(["send", "--state", state, "--id", sessionId, "--text", "from-cli"]),
    );
    assert.equal(send.code, 0);
    assert.match(send.stdout, /Message queued/);

    const recv = await capture(() => main(["recv", "--state", state, "--id", sessionId]));
    assert.match(recv.stdout, /from-cli/);

    const recvJson = await capture(() => main(["--json", "recv", "--state", state, "--id", session.session_id]));
    assert.equal(JSON.parse(recvJson.stdout).ok, true);

    const missing = await capture(() => main(["send", "--state", state]));
    assert.equal(missing.code, 2);
    assert.match(missing.stdout, /session id/);
    assert.match(missing.stdout, /azvpn open/);

    const certDir = join(dir, "lab-tls");
    const cert = await capture(() => main(["cert", "--dir", certDir]));
    assert.equal(cert.code, 0);
    assert.match(cert.stdout, /Lab certificate written/);
    assert.match(cert.stdout, /ACME {2}SLOT/);

    const certJson = await capture(() => main(["--json", "cert", "--dir", certDir]));
    const certBody = JSON.parse(certJson.stdout) as { kind: string; acme: string; note: string };
    assert.equal(certBody.kind, "lab_self_signed");
    assert.equal(certBody.acme, "SLOT");
    assert.match(certBody.note, /Not ACME/);
  });
});

describe("local page", () => {
  it("leads with one action and keeps power features folded", () => {
    const html = uiHtml();
    assert.match(html, /Open a session/);
    assert.match(html, /local HTTP lab/);
    assert.match(html, /id="connect"/);
    assert.match(html, /<summary>Advanced<\/summary>/);
    assert.match(html, /<summary>About<\/summary>/);
    assert.match(html, /prefers-color-scheme:\s*dark/);
    assert.match(html, /:focus-visible/);
    assert.match(html, /#c9a227/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /max-width:\s*480px/);
    assert.doesNotMatch(html, /THIS IS NOT/);
    assert.doesNotMatch(html, /identity lock/i);
    assert.equal((html.match(/<details/g) ?? []).length, 2);
    assert.doesNotMatch(html, /<details[^>]*open/);
  });
});
