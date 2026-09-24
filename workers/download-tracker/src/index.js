import { handleSeoRoutes, renderHome } from "./home.js";
import { handleRuntimeApi } from "./runtime.js";
import { classifyRequest, readBotManagement } from "./classify.js";
import {
  isolatedKeys,
  isReservedCounterKey,
  shapeCountBody,
  shapeHumanBotFields,
} from "./stats-shape.js";

/**
 * AZVPN download tracker (Cloudflare Worker).
 *
 * GET /download increments KV and serves azvpn-0.1.0.tar.gz from ASSETS (HTTP 200, no redirect).
 * Counts are stored as project|owner|repo|branch|fork and summed across branches and forks.
 * /v1, /mcp, and /v1/mesh/* do not increment.
 * Author: Aziel Eliab only. Version is package.json 0.1.0. No invented release.
 */

const PROJECT = "azvpn";
const KEYS = isolatedKeys(PROJECT);
const DEFAULT_ASSET = "azvpn-0.1.0.tar.gz";
const DEFAULT_OWNER = "AzielEliab";
const DEFAULT_REPO = "azvpn";
const DEFAULT_BRANCH = "main";
const HOST = "https://azvpn-download-tracker.vibelock.workers.dev";
const GITHUB_REPO_API = "https://api.github.com/repos/AzielEliab/azvpn";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, User-Agent, Authorization",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function safeIdent(value, fallback) {
  const s = String(value ?? "");
  if (/^[A-Za-z0-9._-]{1,80}$/.test(s)) return s;
  return fallback;
}

function splitOwnerRepo(value, fallbackOwner, fallbackRepo) {
  if (typeof value === "string" && value.includes("/")) {
    const [o, r] = value.split("/").filter(Boolean);
    if (o && r) return { owner: safeIdent(o, fallbackOwner), repo: safeIdent(r, fallbackRepo) };
  }
  return { owner: fallbackOwner, repo: fallbackRepo };
}

export function parseDims(src) {
  const get = (k) => {
    if (src == null) return null;
    if (typeof src.get === "function") {
      const v = src.get(k);
      return v == null || v === "" ? null : v;
    }
    const v = src[k];
    return v == null || v === "" ? null : v;
  };

  let owner = safeIdent(get("owner"), DEFAULT_OWNER);
  let repo = get("repo") || DEFAULT_REPO;
  if (typeof repo === "string" && repo.includes("/")) {
    const split = splitOwnerRepo(repo, owner, DEFAULT_REPO);
    owner = split.owner;
    repo = split.repo;
  } else {
    repo = safeIdent(repo, DEFAULT_REPO);
  }

  const branch = safeIdent(get("branch"), DEFAULT_BRANCH);
  const tag = safeIdent(get("tag"), "latest");
  const assetRaw = get("asset");
  const asset = typeof assetRaw === "string" ? assetRaw : "";

  const forkRaw = get("fork");
  let fork = "0";
  if (forkRaw === 1 || forkRaw === true || forkRaw === "1" || forkRaw === "true") {
    fork = "1";
  } else if (typeof forkRaw === "string" && forkRaw.includes("/")) {
    const split = splitOwnerRepo(forkRaw, owner, repo);
    owner = split.owner;
    repo = split.repo;
    fork = "1";
  } else if (forkRaw != null && forkRaw !== 0 && forkRaw !== false && forkRaw !== "0" && forkRaw !== "false") {
    fork = "1";
  }

  if (`${owner}/${repo}`.toLowerCase() !== `${DEFAULT_OWNER}/${DEFAULT_REPO}`.toLowerCase()) {
    fork = "1";
  }

  return { project: PROJECT, owner, repo, branch, fork, tag, asset };
}

function kvKey(dims) {
  return `${dims.project}|${dims.owner}|${dims.repo}|${dims.branch}|${dims.fork}`;
}

function knownAsset(name) {
  if (name === DEFAULT_ASSET) return DEFAULT_ASSET;
  return null;
}

async function bump(env, key) {
  const n = parseInt((await env.DOWNLOADS.get(key)) || "0", 10) + 1;
  await env.DOWNLOADS.put(key, String(n));
  return n;
}

async function incrementSplit(env, humanKey, botKey, request) {
  const cls = classifyRequest(request);
  const splitKey = cls.bucket === "human" ? humanKey : botKey;
  await bump(env, splitKey);
  return cls;
}

async function increment(env, dims, request) {
  const key = kvKey(dims);
  const n = await bump(env, key);
  await bump(env, KEYS.total);
  if (request) await incrementSplit(env, KEYS.downloads_human, KEYS.downloads_bot, request);
  return n;
}

async function incrementViews(env, request) {
  const n = await bump(env, KEYS.views);
  if (request) await incrementSplit(env, KEYS.views_human, KEYS.views_bot, request);
  return n;
}

async function listAllKeys(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.DOWNLOADS.list(cursor ? { cursor } : {});
    keys.push(...(page.keys || []));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

async function githubStats(env) {
  const cached = await env.DOWNLOADS.get(KEYS.github);
  if (cached) {
    try {
      const obj = JSON.parse(cached);
      if (obj && obj.fetched_at && Date.now() - obj.fetched_at < 5 * 60 * 1000) return obj;
    } catch {
      /* ignore */
    }
  }
  const headers = {
    "User-Agent": "Mozilla/5.0 AZVPN-download-tracker",
    Accept: "application/vnd.github+json",
  };
  let stars = 0;
  let forks = 0;
  let watchers = 0;
  let release_download_count = 0;
  let release_asset_count = 0;
  try {
    const repoRes = await fetch(GITHUB_REPO_API, { headers, signal: AbortSignal.timeout(4000) });
    if (repoRes.ok) {
      const repo = await repoRes.json();
      stars = Number(repo.stargazers_count) || 0;
      forks = Number(repo.forks_count) || 0;
      watchers = Number(repo.subscribers_count != null ? repo.subscribers_count : repo.watchers_count) || 0;
    }
    const relRes = await fetch(`${GITHUB_REPO_API}/releases`, { headers, signal: AbortSignal.timeout(4000) });
    if (relRes.ok) {
      const rels = await relRes.json();
      const list = Array.isArray(rels) ? rels : [];
      for (const rel of list) {
        const assets = Array.isArray(rel.assets) ? rel.assets : [];
        release_asset_count += assets.length;
        release_download_count += assets.reduce((s, a) => s + (Number(a.download_count) || 0), 0);
      }
    }
  } catch {
    /* public API; zeros stay honest */
  }
  const out = { stars, forks, watchers, release_download_count, release_asset_count, fetched_at: Date.now() };
  try {
    await env.DOWNLOADS.put(KEYS.github, JSON.stringify(out));
  } catch {
    /* ignore */
  }
  return out;
}

async function collectStats(env, request) {
  const keys = await listAllKeys(env);
  let summed = 0;
  const by_repo = {};
  const by_branch = {};
  const by_fork = { "0": 0, "1": 0 };
  const breakdown = [];

  for (const k of keys) {
    const name = k.name;
    if (isReservedCounterKey(name, PROJECT)) continue;
    const n = parseInt((await env.DOWNLOADS.get(name)) || "0", 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    const parts = name.split("|");
    if (parts.length < 5) continue;
    const [project, owner, repo, branch, fork] = parts;
    summed += n;
    const repoId = `${owner}/${repo}`;
    by_repo[repoId] = (by_repo[repoId] || 0) + n;
    by_branch[branch] = (by_branch[branch] || 0) + n;
    const forkFlag = fork === "1" ? "1" : "0";
    by_fork[forkFlag] = (by_fork[forkFlag] || 0) + n;
    breakdown.push({ project, owner, repo, branch, fork: forkFlag, count: n });
  }

  const totalDirect = parseInt((await env.DOWNLOADS.get(KEYS.total)) || "0", 10) || 0;
  const views = parseInt((await env.DOWNLOADS.get(KEYS.views)) || "0", 10) || 0;
  const downloads = totalDirect > 0 ? totalDirect : summed;
  const github = await githubStats(env);
  const viewsHuman = parseInt((await env.DOWNLOADS.get(KEYS.views_human)) || "0", 10) || 0;
  const downloadsHuman = parseInt((await env.DOWNLOADS.get(KEYS.downloads_human)) || "0", 10) || 0;
  const botManagementAvailable = request ? readBotManagement(request).available : false;

  return {
    project: PROJECT,
    total: downloads,
    views,
    downloads,
    by_repo,
    by_branch,
    by_fork,
    breakdown,
    summed,
    github: {
      stars: github.stars || 0,
      forks: github.forks || 0,
      watchers: github.watchers || 0,
      release_download_count: github.release_download_count || 0,
      release_asset_count: github.release_asset_count || 0,
    },
    ...shapeHumanBotFields({
      views,
      downloads,
      views_human: viewsHuman,
      downloads_human: downloadsHuman,
      botManagementAvailable,
    }),
    note: "Each download is stored as project|owner|repo|branch|fork. Totals sum every branch and fork. /v1 does not increment.",
  };
}

function installScript(requestUrl) {
  let origin = HOST;
  try {
    origin = new URL(requestUrl).origin;
  } catch {
    origin = HOST;
  }
  return `#!/usr/bin/env bash
# AZVPN one-click install. The counted download is this Worker's archive.
set -euo pipefail
HOST="${origin}"
ASSET="${DEFAULT_ASSET}"
WORKDIR="\${AZVPN_HOME:-\$HOME/azvpn}"
mkdir -p "\$WORKDIR"
cd "\$WORKDIR"
echo "Downloading \${ASSET} from \${HOST}/download"
curl -fsSL -A 'Mozilla/5.0' "\${HOST}/download?asset=\${ASSET}" -o "\${ASSET}"
tar -xzf "\${ASSET}"
if [ -d "azvpn-0.1.0" ]; then
  cd "azvpn-0.1.0"
fi
npm install
echo
echo "Installed AZVPN 0.1.0 from the counted archive."
echo "Run:  npx tsx src/cli.ts serve"
echo "Then open http://127.0.0.1:8787  (loopback only)"
echo "Author: Aziel Eliab."
`;
}

async function serveAsset(request, env, asset, { head = false } = {}) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return json({ error: "assets binding missing", asset }, 500);
  }
  const assetUrl = new URL("/" + asset, request.url);
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!assetRes.ok) {
    return json({ error: "asset not hosted", asset, status: assetRes.status }, 404);
  }
  const headers = new Headers();
  headers.set("Content-Type", "application/gzip");
  headers.set("Content-Disposition", `attachment; filename="${asset}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Azvpn-Asset", asset);
  const len = assetRes.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  if (head) return new Response(null, { status: 200, headers });
  return new Response(assetRes.body, { status: 200, headers });
}

function resolveAsset(url, dims) {
  if (dims.asset) return knownAsset(dims.asset);
  if (url.pathname.startsWith("/download/")) {
    const fromPath = decodeURIComponent(url.pathname.slice("/download/".length).replace(/\/+$/, ""));
    return knownAsset(fromPath);
  }
  if (url.pathname === "/download" || url.pathname === "/go") return DEFAULT_ASSET;
  return null;
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const seo = handleSeoRoutes(request, url);
  if (seo) return seo;

  if ((url.pathname === "/install.sh" || url.pathname === "/install.sh/") && request.method === "GET") {
    return new Response(installScript(request.url), {
      status: 200,
      headers: {
        "Content-Type": "text/x-shellscript; charset=utf-8",
        "Cache-Control": "private, no-store",
        ...corsHeaders(),
      },
    });
  }

  const runtime = await handleRuntimeApi(request, url, env);
  if (runtime) return runtime;

  if (url.pathname === "/" && request.method === "GET") {
    await incrementViews(env, request);
    const html = renderHome(await collectStats(env, request));
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        ...corsHeaders(),
      },
    });
  }

  if (url.pathname === "/count" && request.method === "GET") {
    const stats = await collectStats(env, request);
    return json(shapeCountBody({
      project: PROJECT,
      views: stats.views || 0,
      downloads: stats.downloads || 0,
      total: stats.total || 0,
      views_human: stats.views_human,
      downloads_human: stats.downloads_human,
      botManagementAvailable: readBotManagement(request).available,
    }));
  }

  if (url.pathname === "/stats" && request.method === "GET") {
    return json(await collectStats(env, request));
  }

  if (url.pathname === "/event" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON body required" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "JSON object required" }, 400);
    }
    const dims = parseDims(body);
    const count = await increment(env, dims, request);
    return json({
      ok: true,
      key: kvKey(dims),
      count,
      owner: dims.owner,
      repo: dims.repo,
      branch: dims.branch,
      fork: dims.fork,
      asset: dims.asset || null,
    });
  }

  const downloadPath = url.pathname === "/download"
    || url.pathname.startsWith("/download/")
    || url.pathname === "/go";
  if (downloadPath && (request.method === "GET" || request.method === "HEAD")) {
    const dims = parseDims(url.searchParams);
    const asset = resolveAsset(url, dims);
    if (!asset) {
      return json({
        error: "asset not hosted",
        asset: dims.asset || null,
        hosted: DEFAULT_ASSET,
        note: "This Worker serves azvpn-0.1.0.tar.gz built from the repository. No other build is published.",
      }, 404);
    }
    dims.asset = asset;
    if (request.method === "GET") await increment(env, dims, request);
    return serveAsset(request, env, asset, { head: request.method === "HEAD" });
  }

  return json({ error: "not found", product: PROJECT }, 404);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

export const TRACKER = {
  project: PROJECT,
  asset: DEFAULT_ASSET,
  host: HOST,
  version: "0.1.0",
};
