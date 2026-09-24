#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BindPolicyError, DEFAULT_BIND, DEFAULT_PORT } from "./bind.js";
import { AzvpnEngine } from "./engine.js";
import { withState } from "./persist.js";
import { helpAdvancedText, helpText, present, welcomeJson, welcomeText } from "./present.js";
import { listen } from "./server.js";
import { envFlag, TlsPolicyError, writeLabCertificate } from "./tls.js";
import { VERSION } from "./types.js";

const VALUE_FLAGS = new Set([
  "--state",
  "--host",
  "--port",
  "--peer",
  "--mode",
  "--id",
  "--session",
  "--text",
  "--body",
  "--cookie",
  "--token",
  "--tls-cert",
  "--tls-key",
  "--dir",
  "--cn",
]);

const BOOL_FLAGS = new Set([
  "--json",
  "--tls",
  "--expose-non-loopback",
  "--x25519-only",
  "--classical-only",
  "--help",
  "-h",
  "--version",
]);

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

function positionals(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!;
    if (token === "--") {
      out.push(...args.slice(i + 1));
      break;
    }
    const name = token.includes("=") ? token.slice(0, token.indexOf("=")) : token;
    if (VALUE_FLAGS.has(name)) {
      if (!token.includes("=")) i += 1;
      continue;
    }
    if (BOOL_FLAGS.has(token)) continue;
    out.push(token);
  }
  return out;
}

function statePath(args: string[]): string {
  return resolve(arg(args, "--state", process.env.AZVPN_STATE ?? ".azvpn-state.json")!);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function emit(asJson: boolean, command: string, result: Record<string, unknown>, hadId = false): void {
  if (asJson) printJson(result);
  else process.stdout.write(present(command, result, { hadId }));
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const asJson = flag(argv, "--json");
  const words = positionals(argv);
  const op = words[0];
  const helpAsked = flag(argv, "--help") || flag(argv, "-h") || op === "help";

  if (helpAsked || op === "advanced") {
    const advanced = op === "advanced" || words[1] === "advanced";
    process.stdout.write(advanced ? helpAdvancedText() : helpText());
    return 0;
  }
  if (op === "--version" || op === "version" || flag(argv, "--version")) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (!op) {
    if (asJson) printJson(welcomeJson());
    else process.stdout.write(welcomeText());
    return 0;
  }
  if (op === "cert") {
    const dir = resolve(arg(argv, "--dir", process.env.AZVPN_TLS_DIR ?? "./lab-tls")!);
    const cn = arg(argv, "--cn", "127.0.0.1")!;
    const written = writeLabCertificate(dir, cn);
    const result = {
      ok: true,
      op: "cert",
      honesty: "REAL",
      kind: "lab_self_signed",
      acme: "SLOT",
      cn: written.cn,
      cert: written.certPath,
      key: written.keyPath,
      note: "Lab certificate written. Not ACME. Not a public CA. Use --tls --tls-cert --tls-key. Node TLS is classical (HN-DR).",
    };
    emit(asJson, "cert", result);
    return 0;
  }
  if (op === "serve" || op === "ui") {
    const host = arg(argv, "--host", process.env.AZVPN_HOST ?? DEFAULT_BIND)!;
    const portRaw = arg(argv, "--port", process.env.AZVPN_PORT ?? String(DEFAULT_PORT))!;
    const port = Number(portRaw);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      const result = {
        ok: false as const,
        code: "AZVPN-BAD-PORT",
        note: "Port must be an integer from 0 to 65535.",
      };
      emit(asJson, op, result);
      return 2;
    }
    const exposeNonLoopback =
      flag(argv, "--expose-non-loopback") || process.env.AZVPN_EXPOSE_NON_LOOPBACK === "1";
    const token = arg(argv, "--token", process.env.AZVPN_TOKEN);
    const tls = flag(argv, "--tls") || envFlag(process.env.AZVPN_TLS);
    const tlsCert = arg(argv, "--tls-cert", process.env.AZVPN_TLS_CERT);
    const tlsKey = arg(argv, "--tls-key", process.env.AZVPN_TLS_KEY);
    const engine = withState(statePath(argv), (e) => e);
    try {
      const listened = await listen({
        host,
        port,
        engine,
        exposeNonLoopback,
        token,
        tls,
        tlsCert,
        tlsKey,
      });
      const scheme = listened.tls.enabled ? "https" : "http";
      process.stdout.write(`Open ${scheme}://${host}:${listened.port}/\n`);
      if (listened.policy.danger) process.stdout.write(`${listened.policy.danger}\n`);
      const stop = async () => {
        await listened.close();
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
        emit(asJson, op, err.toJSON());
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
    const result = new AzvpnEngine().dispatch("x25519_only");
    emit(asJson, "x25519_only", result);
    return 2;
  }
  if (flag(argv, "--classical-only")) {
    const result = new AzvpnEngine().dispatch("classical_only");
    emit(asJson, "classical_only", result);
    return 2;
  }

  const result = withState(statePath(argv), (engine) => engine.dispatch(op, payload));
  emit(asJson, op, result, Boolean(id));
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
