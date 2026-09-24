import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { gunzipSync } from "node:zlib";
import { LIMITATION } from "../src/honesty.js";
import { THEME } from "../workers/download-tracker/src/home.js";
import { TRACKER, handleRequest } from "../workers/download-tracker/src/index.js";
import { RUNTIME_TEXT } from "../workers/download-tracker/src/runtime.js";

const ARCHIVE = new URL("../workers/download-tracker/public/azvpn-0.1.0.tar.gz", import.meta.url);

function memoryKv() {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async put(key: string, value: string) {
      store.set(key, String(value));
    },
    async list() {
      return {
        keys: [...store.keys()].map((name) => ({ name })),
        list_complete: true,
      };
    },
  };
}

function diskAssets() {
  return {
    async fetch(request: Request) {
      const url = new URL(request.url);
      const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
      const file = new URL("../workers/download-tracker/public/" + name, import.meta.url);
      if (name.includes("..") || !existsSync(file)) {
        return new Response("missing", { status: 404 });
      }
      const buf = readFileSync(file);
      return new Response(buf, {
        status: 200,
        headers: { "content-length": String(buf.byteLength) },
      });
    },
  };
}

function makeEnv(fetchImpl?: typeof fetch) {
  const env: Record<string, unknown> = {
    DOWNLOADS: memoryKv(),
    ASSETS: diskAssets(),
    AZIEL_RUNTIME_ORIGIN: "https://aziel-runtime.example",
  };
  if (fetchImpl) {
    env.AZIEL_RUNTIME = { fetch: fetchImpl };
  }
  return env;
}

async function call(
  path: string,
  init: RequestInit = {},
  env: Record<string, unknown> = makeEnv(),
) {
  const headers = new Headers(init.headers);
  if (!headers.has("user-agent")) headers.set("user-agent", "Mozilla/5.0");
  const req = new Request("http://127.0.0.1" + path, { ...init, headers });
  const previous = globalThis.fetch;
  globalThis.fetch = (async () => new Response("[]", { status: 200 })) as typeof fetch;
  try {
    return await handleRequest(req, env);
  } finally {
    globalThis.fetch = previous;
  }
}

function contrast(hexA: string, hexB: string) {
  const lum = (hex: string) => {
    const n = hex.replace("#", "");
    const rgb = [0, 2, 4].map((i) => {
      const c = parseInt(n.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const a = lum(hexA);
  const b = lum(hexB);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

describe("download tracker", () => {
  it("serves the real 0.1.0 archive and counts once per download", async () => {
    assert.equal(TRACKER.version, "0.1.0");
    assert.equal(TRACKER.asset, "azvpn-0.1.0.tar.gz");
    assert.ok(statSync(ARCHIVE).size > 1000);
    const listing = execFileSync("tar", ["-tzf", ARCHIVE.pathname], { encoding: "utf8" });
    assert.match(listing, /azvpn-0\.1\.0\/package\.json/);
    assert.match(listing, /azvpn-0\.1\.0\/src\/cli\.ts/);
    const packed = execFileSync("tar", ["-xOzf", ARCHIVE.pathname, "azvpn-0.1.0/package.json"], { encoding: "utf8" });
    assert.equal(JSON.parse(packed).version, "0.1.0");

    const env = makeEnv();
    const res = await call("/download", {}, env);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /gzip/);
    assert.match(res.headers.get("content-disposition") || "", /azvpn-0\.1\.0\.tar\.gz/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.equal(bytes[0], 0x1f);
    assert.equal(bytes[1], 0x8b);
    const raw = gunzipSync(bytes);
    assert.ok(raw.byteLength > 100);

    const again = await call("/download?branch=dev", {}, env);
    assert.equal(again.status, 200);
    const fork = await call("/download?owner=Other&repo=azvpn&branch=main", {}, env);
    assert.equal(fork.status, 200);

    const count = await call("/count", {}, env);
    const body = await count.json();
    assert.equal(body.project, "azvpn");
    assert.equal(body.downloads, 3);
    assert.equal(body.total, 3);
    assert.equal(body.downloads, body.downloads_human + body.downloads_bot);

    const statsRes = await call("/stats", {}, env);
    const stats = await statsRes.json();
    assert.equal(stats.by_branch.main, 2);
    assert.equal(stats.by_branch.dev, 1);
    assert.equal(stats.by_fork["0"], 2);
    assert.equal(stats.by_fork["1"], 1);
    assert.equal(stats.by_repo["AzielEliab/azvpn"], 2);
    assert.equal(stats.by_repo["Other/azvpn"], 1);
  });

  it("does not count a missing asset, a HEAD, or a /v1 read", async () => {
    const env = makeEnv();
    const missing = await call("/download?asset=azvpn-9.9.9.tar.gz", {}, env);
    assert.equal(missing.status, 404);
    const head = await call("/download", { method: "HEAD" }, env);
    assert.equal(head.status, 200);
    const health = await call("/v1/health", {}, env);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.version, "0.1.0");
    assert.equal(healthBody.tls_on_this_worker, false);
    assert.equal(healthBody.mesh_enabled_by_get, false);
    const count = await call("/count", {}, env);
    const body = await count.json();
    assert.equal(body.downloads, 0);
    assert.equal(body.views, 0);
  });

  it("classifies an empty user-agent as bot and keeps the human/bot invariant", async () => {
    const env = makeEnv();
    await call("/download", { headers: { "user-agent": "" } }, env);
    const count = await call("/count", {}, env);
    const body = await count.json();
    assert.equal(body.downloads, 1);
    assert.equal(body.downloads_human, 0);
    assert.equal(body.downloads_bot, 1);
  });

  it("renders a one-click landing without invented claims", async () => {
    const env = makeEnv();
    const res = await call("/", {}, env);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<h1>AZVPN<\/h1>/);
    assert.match(html, /HTTP\/WS lab concentrator/);
    assert.match(html, /id="download" href="\/download"/);
    assert.match(html, /prefers-color-scheme:\s*light/);
    assert.match(html, /:focus-visible/);
    assert.match(html, /Features/);
    assert.match(html, /lab-ui\.png/);
    assert.match(html, /0\.1\.0/);
    assert.doesNotMatch(html, /THIS IS NOT/i);
    assert.doesNotMatch(html, /what this is not/i);
    assert.doesNotMatch(html, /identity-lock/i);
    assert.doesNotMatch(html, /untraceable/i);
    assert.doesNotMatch(html, /WireGuard/i);
    assert.doesNotMatch(html, /\bscore\b/i);
    assert.doesNotMatch(html, /9\.9\.9|1\.0\.0|0\.2\.0/);
    for (const theme of [THEME.dark, THEME.light]) {
      assert.ok(contrast(theme.ink, theme.bg) >= 4.5);
      assert.ok(contrast(theme.muted, theme.bg) >= 4.5);
      assert.ok(contrast(theme.btnInk, theme.btnBg) >= 4.5);
      assert.ok(contrast(theme.focus, theme.bg) >= 3);
    }
  });

  it("keeps FragGate as the door and does not increment on proxy or MCP", async () => {
    const seen: { url: string; method: string; body: string }[] = [];
    const env = makeEnv(async (input, init) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? new TextDecoder().decode(init.body as ArrayBuffer) : "";
      seen.push({ url, method, body });
      return new Response(JSON.stringify({ ok: true, proxied: true, enabled: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const mesh = await call("/v1/mesh", {}, env);
    assert.equal(mesh.status, 200);
    assert.equal(mesh.headers.get("x-aziel-door"), "proxy");
    const meshBody = await mesh.json();
    assert.equal(meshBody.proxied, true);
    assert.equal(seen[0].method, "GET");
    assert.equal(seen[0].body, "");
    assert.match(seen[0].url, /\/v1\/mesh$/);

    const open = await call("/v1/open", { method: "POST", body: JSON.stringify({ peer: "alice" }) }, env);
    assert.equal(open.status, 400);
    const refused = await open.json();
    assert.equal(refused.code, "AZVPN-DOOR");
    assert.equal(seen.length, 1);

    const mcp = await call("/mcp", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    }, env);
    const rpc = await mcp.json();
    const names = rpc.result.tools.map((tool: { name: string }) => tool.name);
    assert.deepEqual(names, [
      "azvpn_health",
      "azvpn_skill",
      "azvpn_doctor",
      "azvpn_limitation",
      "azvpn_describe",
    ]);
    const count = await call("/count", {}, env);
    const body = await count.json();
    assert.equal(body.downloads, 0);
  });

  it("matches the repository limitation text and records a fork event", async () => {
    assert.equal(RUNTIME_TEXT.LIMITATION, LIMITATION);
    assert.equal(RUNTIME_TEXT.VERSION, "0.1.0");
    const env = makeEnv();
    const limit = await call("/v1/limitation", {}, env);
    const limitBody = await limit.json();
    assert.equal(limitBody.limitation, LIMITATION);
    const event = await call("/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner: "ForkUser", repo: "azvpn", branch: "feature", fork: true }),
    }, env);
    assert.equal(event.status, 200);
    const stats = await (await call("/stats", {}, env)).json();
    assert.equal(stats.by_branch.feature, 1);
    assert.equal(stats.by_fork["1"], 1);
    assert.equal(stats.downloads, 1);
  });
});
