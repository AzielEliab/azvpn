#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BindPolicyError, DEFAULT_BIND, DEFAULT_PORT } from "./bind.js";
import { AzvpnEngine } from "./engine.js";
import { withState } from "./persist.js";
import { listen } from "./server.js";
import { envFlag, TlsPolicyError, writeLabCertificate } from "./tls.js";
import { NAME, VERSION } from "./types.js";

function arg(args: string[], name: string, fallback?: string): string | undefined {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1];
  const pref = args.find((a) => a.startsWith(`${name}=`));
  if (pref) return pref.slice(name.length + 1);
  return fallback;
}

function flag(args: string[], name: string): boolean {
  return args.includes(name);
}

function help(): string {
  return `${NAME} ${VERSION} — HTTP/WS lab concentrator + optional Node TLS + in-process onion circuits
Author Aziel Eliab only. Apache-2.0.

Default listen() is plain HTTP + WS (Node http). HTTPS is REAL only when --tls
plus cert/key actually terminate TLS. ACME is SLOT.

Usage:
  azvpn health|doctor|limitation|skill
  azvpn open [--peer NAME] [--mode http_ws|onion|rendezvous] [--cookie REND]
  azvpn status --id SESSION
  azvpn list
  azvpn send --id SESSION --text MSG
  azvpn recv --id SESSION
  azvpn close --id SESSION
  azvpn peers
  azvpn attach --id SESSION
  azvpn circuit --id SESSION
  azvpn serve [--host 127.0.0.1] [--port 8787] [--tls]
  azvpn cert [--dir ./lab-tls] [--cn 127.0.0.1]
  azvpn ui                 (alias of serve)

TLS (fail closed):
  --tls                  require cert/key; refuse without them
  --tls-cert PATH        or AZVPN_TLS_CERT
  --tls-key PATH         or AZVPN_TLS_KEY
  AZVPN_TLS=1            same as --tls
  azvpn cert             writes lab-tls/cert.pem + key.pem (openssl or in-process RSA)
  Lab only. Not ACME. Node TLS is classical (HN-DR residual).

Bind: default 127.0.0.1. Non-loopback is refused unless BOTH:
  --expose-non-loopback
  --token TOKEN   (or AZVPN_TOKEN, ≥16 chars)
Danger: token query strings leak. Prefer loopback.

State file: --state PATH or AZVPN_STATE (default ./.azvpn-state.json)
HTTP/WS lab + onion peel are REAL. HTTPS REAL only when this process terminates TLS.
WireGuard, public Tor, origin-hiding, ACME are SLOT.
No latency theater. No untraceable proven.
`;
}

function statePath(args: string[]): string {
  return resolve(arg(args, "--state", process.env.AZVPN_STATE ?? ".azvpn-state.json")!);
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const op = argv[0];
  if (!op || op === "--help" || op === "help") {
    process.stdout.write(help());
    return 0;
  }
  if (op === "--version" || op === "version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (op === "cert") {
    const dir = resolve(arg(argv, "--dir", process.env.AZVPN_TLS_DIR ?? "./lab-tls")!);
    const cn = arg(argv, "--cn", "127.0.0.1")!;
    const written = writeLabCertificate(dir, cn);
    print({
      ok: true,
      op: "cert",
      honesty: "REAL",
      kind: "lab_self_signed",
      acme: "SLOT",
      cn: written.cn,
      cert: written.certPath,
      key: written.keyPath,
      note: "Lab certificate written. Not ACME. Not a public CA. Use --tls --tls-cert --tls-key. Node TLS is classical (HN-DR).",
    });
    return 0;
  }
  if (op === "serve" || op === "ui") {
    const host = arg(argv, "--host", process.env.AZVPN_HOST ?? DEFAULT_BIND)!;
    const port = Number(arg(argv, "--port", process.env.AZVPN_PORT ?? String(DEFAULT_PORT)));
    const exposeNonLoopback =
      flag(argv, "--expose-non-loopback") || process.env.AZVPN_EXPOSE_NON_LOOPBACK === "1";
    const token = arg(argv, "--token", process.env.AZVPN_TOKEN);
    const tls = flag(argv, "--tls") || envFlag(process.env.AZVPN_TLS);
    const tlsCert = arg(argv, "--tls-cert", process.env.AZVPN_TLS_CERT);
    const tlsKey = arg(argv, "--tls-key", process.env.AZVPN_TLS_KEY);
    const engine = withState(statePath(argv), (e) => e);
    try {
      const { close, policy, tls: tlsMat } = await listen({
        host,
        port,
        engine,
        exposeNonLoopback,
        token,
        tls,
        tlsCert,
        tlsKey,
      });
      const scheme = tlsMat.enabled ? "https" : "http";
      process.stdout.write(
        `${NAME} listening ${scheme}://${host}:${port}/ (${tlsMat.enabled ? "TLS terminate REAL" : "HTTP/WS lab, tls=false"})\n`,
      );
      process.stdout.write(
        tlsMat.enabled
          ? "REAL: HTTPS/WSS terminate + onion layering. SLOT: ACME, WireGuard, public Tor, origin-hiding.\n"
          : "REAL: HTTP/WS lab + onion layering. SLOT: HTTPS/TLS (not terminating), ACME, WireGuard, public Tor, origin-hiding.\n",
      );
      if (policy.danger) process.stdout.write(`DANGER: ${policy.danger}\n`);
      const stop = async () => {
        await close();
        process.exit(0);
      };
      process.on("SIGINT", () => {
        void stop();
      });
      process.on("SIGTERM", () => {
        void stop();
      });
      await new Promise(() => undefined);
      return 0;
    } catch (err) {
      if (err instanceof BindPolicyError || err instanceof TlsPolicyError) {
        print(err.toJSON());
        return 2;
      }
      throw err;
    }
  }

  const payload: Record<string, unknown> = {};
  const id = arg(argv, "--id") ?? arg(argv, "--session");
  if (id) payload.session_id = id;
  const peer = arg(argv, "--peer");
  if (peer) payload.peer = peer;
  const mode = arg(argv, "--mode");
  if (mode) payload.mode = mode;
  const cookie = arg(argv, "--cookie");
  if (cookie) payload.cookie = cookie;
  const text = arg(argv, "--text") ?? arg(argv, "--body");
  if (text) payload.text = text;
  if (flag(argv, "--x25519-only")) {
    print(new AzvpnEngine().dispatch("x25519_only"));
    return 2;
  }
  if (flag(argv, "--classical-only")) {
    print(new AzvpnEngine().dispatch("classical_only"));
    return 2;
  }

  const result = withState(statePath(argv), (engine) => engine.dispatch(op, payload));
  print(result);
  return result.ok === false ? 2 : 0;
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : "";
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  main().then((code) => {
    if (code !== 0) process.exitCode = code;
  }, (err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
}
