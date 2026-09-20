#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BindPolicyError, DEFAULT_BIND, DEFAULT_PORT } from "./bind.js";
import { AzvpnEngine } from "./engine.js";
import { withState } from "./persist.js";
import { listen } from "./server.js";
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
  return `${NAME} ${VERSION} — HTTP/WS lab concentrator + in-process onion circuits
Author Aziel Eliab only. Apache-2.0.

This listen() is plain HTTP + WS (Node http). Not TLS. HTTPS/TLS is SLOT here.

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
  azvpn serve [--host 127.0.0.1] [--port 8787]
  azvpn ui                 (alias of serve)

Bind: default 127.0.0.1. Non-loopback is refused unless BOTH:
  --expose-non-loopback
  --token TOKEN   (or AZVPN_TOKEN, ≥16 chars)
Danger: non-loopback HTTP/WS has no TLS. Token query strings leak. Prefer loopback.

State file: --state PATH or AZVPN_STATE (default ./.azvpn-state.json)
HTTP/WS lab + onion peel are REAL. HTTPS/TLS, WireGuard, public Tor, origin-hiding are SLOT.
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
  if (op === "serve" || op === "ui") {
    const host = arg(argv, "--host", process.env.AZVPN_HOST ?? DEFAULT_BIND)!;
    const port = Number(arg(argv, "--port", process.env.AZVPN_PORT ?? String(DEFAULT_PORT)));
    const exposeNonLoopback =
      flag(argv, "--expose-non-loopback") || process.env.AZVPN_EXPOSE_NON_LOOPBACK === "1";
    const token = arg(argv, "--token", process.env.AZVPN_TOKEN);
    const engine = withState(statePath(argv), (e) => e);
    try {
      const { close, policy } = await listen({ host, port, engine, exposeNonLoopback, token });
      process.stdout.write(`${NAME} listening http://${host}:${port}/ (HTTP/WS lab, tls=false)\n`);
      process.stdout.write("REAL: HTTP/WS lab + onion layering. SLOT: HTTPS/TLS, WireGuard, public Tor, origin-hiding.\n");
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
      if (err instanceof BindPolicyError) {
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
