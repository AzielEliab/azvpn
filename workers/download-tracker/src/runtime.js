/**
 * AZVPN Worker agent surface.
 * Read paths are local. Session ops stay on FragGate (slug azvpn) or the local Node lab.
 * /v1 never increments DOWNLOADS. GET never enables mesh.
 * Author: Aziel Eliab only.
 */
import { classifyV1Path, doorTargetUrl } from "./door.js";

const PRODUCT = "azvpn";
const NAME = "AZVPN";
const VERSION = "0.1.0";
const AUTHOR = "Aziel Eliab";
const HOST = "https://azvpn-download-tracker.vibelock.workers.dev";
const GITHUB = "https://github.com/AzielEliab/azvpn";
const CATALOG_MCP = "https://aziel-runtime.vibelock.workers.dev/mcp";
const FRAGGATE_CALL = "https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call";
const MOTTO =
  "App-layer envelopes and onion peel are REAL. HTTPS is REAL only when this process terminates TLS. Kernel VPN and public Tor stay SLOT.";
const LIMITATION =
  "THIS IS: AZVPN (AZVPN-CONCENTRATOR-1.0 + AZVPN-ONION-1.0) — Default listen() is a standalone application-layer HTTP/WS lab concentrator (plain Node http + ws, not TLS). HTTPS/TLS is REAL only when --tls plus cert/key actually terminate TLS; otherwise SLOT. Plus in-process multi-hop onion circuits (entry → middle → exit / rendezvous) with a designed hybrid PQC handshake (X25519 + ML-KEM-768; classical-only fail-closed). Encrypted envelopes, WS/WSS attach, onion layering, fixed-size cells, and local rendezvous join are REAL. Bind defaults to 127.0.0.1. THIS IS NOT: ACME, a WireGuard/OpenVPN/L3 kernel UDP concentrator, a public Tor directory/exit, SOCKS, origin-hiding fabric, or an untraceable proof. Those stay SLOT and refuse. Non-loopback listen requires --expose-non-loopback plus a bearer token or it refuses. NOT_QUANTUM_PROOF residuals stay labeled (host metadata, Grover AEAD, HN-DR, wipe side-channel). No latency theater. Sister private Lumen may adapter-pair later; this repo is standalone and holds no Lumen canon. Author: Aziel Eliab only.";

const LIVE_OPS = [
  "health", "skill", "doctor", "limitation", "describe",
  "open", "status", "list", "close", "send", "recv", "pull", "peers", "attach", "circuit",
];
const READ_OPS = ["health", "skill", "doctor", "limitation", "describe"];
const DOOR_NOTE =
  "This Worker serves the counted source archive and read-only status. It does not open circuits and it does not terminate TLS. Session ops run in the local lab (npx tsx src/cli.ts serve) or through FragGate slug azvpn. GET never enables mesh.";

const SKILL = `---
name: AZVPN
description: >-
  Standalone HTTP/WS lab concentrator with optional Node TLS terminate
  and in-process onion circuits. HTTPS REAL only when TLS terminates.
  Author Aziel Eliab.
---

# AZVPN

${MOTTO}

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
Version: ${VERSION}
GitHub: ${GITHUB}
Download tracker: ${HOST}/download
Archive: azvpn-0.1.0.tar.gz (built from this repository; package.json ${VERSION})

${DOOR_NOTE}

Always send \`User-Agent: Mozilla/5.0\`.

## This Worker

| Method | Path | What |
|--------|------|------|
| GET | \`/download\` | Counted gzip of azvpn-0.1.0.tar.gz. HTTP 200. |
| GET | \`/count\` | \`{project, views, downloads, total}\`. Does not increment. |
| GET | \`/v1/health\` | Tracker liveness. Does not increment. |
| GET | \`/v1/skill\` | This markdown. Does not increment. |
| GET | \`/v1/doctor\` | Read-only self-check. Does not increment. |
| GET | \`/v1/limitation\` | Lab honesty text from this repository. Does not increment. |
| GET | \`/v1/describe\` | Read-only describe. Does not increment. |
| GET | \`/v1/fraggate/list\` | PROXY to aziel-runtime. Not a second door. |
| GET | \`/v1/fraggate/describe\` | PROXY to aziel-runtime. |
| POST | \`/v1/fraggate/call\` | PROXY to aziel-runtime. FragGate remains the executable door. |
| GET | \`/v1/mesh\` | PROXY. Does not enable mesh. |
| GET | \`/mcp\` | MCP docs. Does not increment. |
| POST | \`/mcp\` | JSON-RPC for the read-only tools below. |

Catalog MCP: \`${CATALOG_MCP}\` with FragGate slug \`${PRODUCT}\`.
Catalog call: \`POST ${FRAGGATE_CALL}\` body \`{"slug":"azvpn","op":"health"}\`.

## Local lab

\`\`\`bash
npx tsx src/cli.ts serve
npx tsx src/cli.ts open --peer alice --mode onion
\`\`\`

Open http://127.0.0.1:8787. Non-loopback needs \`--expose-non-loopback\` and a bearer token.
\`--tls\` without a cert and key fail-closes.

## Live ops (local lab and catalog)

${LIVE_OPS.map((op) => "- `" + op + "`").join("\n")}

Read tools on this Worker: ${READ_OPS.map((op) => "`azvpn_" + op + "`").join(", ")}.
Session tools are not executed here.
`;

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

function describeBody() {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    author: AUTHOR,
    identity: "Aziel Eliab only",
    license: "Apache-2.0",
    github: GITHUB,
    motto: MOTTO,
    surface: "download-tracker",
    asset: "azvpn-0.1.0.tar.gz",
    lab: {
      listen: "127.0.0.1:8787",
      command: "npx tsx src/cli.ts serve",
      tls_on_this_worker: false,
      https_tls: "SLOT",
      http_ws: "REAL",
      onion_circuit_layering: "REAL",
      hybrid_pqc_handshake: "REAL",
      rendezvous_join: "REAL",
    },
    door: "fraggate",
    slug: PRODUCT,
    live_ops: LIVE_OPS,
    read_ops_here: READ_OPS,
    agent_path: FRAGGATE_CALL,
    note: DOOR_NOTE,
  };
}

function healthBody() {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    author: AUTHOR,
    surface: "download-tracker",
    tls_on_this_worker: false,
    https_tls: "SLOT",
    door: "fraggate",
    slug: PRODUCT,
    kv_increment: false,
    mesh_enabled_by_get: false,
    note: DOOR_NOTE,
  };
}

function doctorBody() {
  return {
    ok: true,
    product: PRODUCT,
    version: VERSION,
    author: AUTHOR,
    identity: "Aziel Eliab only",
    worker_local: true,
    fraggate_live: false,
    asset: "azvpn-0.1.0.tar.gz",
    tls_on_this_worker: false,
    circuits_opened_here: false,
    note: "Read-only self-check. The lab engine stays in the Node process after install. This response does not enable mesh and does not open a session.",
  };
}

function doorRefusal(op) {
  return {
    ok: false,
    code: "AZVPN-DOOR",
    op,
    honesty: "REAL",
    door: "fraggate",
    slug: PRODUCT,
    agent_path: FRAGGATE_CALL,
    local: "npx tsx src/cli.ts serve",
    note: `This Worker does not run \`${op}\`. Use the local lab, or POST FragGate with slug azvpn. Nothing was enabled.`,
  };
}

function openapiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "AZVPN download tracker",
      version: VERSION,
      description: DOOR_NOTE,
      license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    },
    servers: [{ url: HOST }],
    paths: {
      "/download": {
        get: {
          operationId: "downloadArchive",
          summary: "Counted download of azvpn-0.1.0.tar.gz",
          responses: { "200": { description: "gzip archive" } },
        },
      },
      "/count": {
        get: {
          operationId: "downloadCount",
          summary: "Views and downloads. total equals downloads. Does not increment.",
          responses: { "200": { description: "count JSON" } },
        },
      },
      "/v1/health": { get: { operationId: "health", summary: "Tracker liveness", responses: { "200": { description: "health" } } } },
      "/v1/skill": { get: { operationId: "skill", summary: "Skill markdown", responses: { "200": { description: "markdown" } } } },
      "/v1/doctor": { get: { operationId: "doctor", summary: "Read-only self-check", responses: { "200": { description: "doctor" } } } },
      "/v1/limitation": { get: { operationId: "limitation", summary: "Lab honesty text", responses: { "200": { description: "limitation" } } } },
      "/v1/describe": { get: { operationId: "describe", summary: "Read-only describe", responses: { "200": { description: "describe" } } } },
      "/v1/fraggate/call": {
        post: {
          operationId: "fraggateCall",
          summary: "Proxy to aziel-runtime FragGate. This Worker does not execute the op itself.",
          responses: { "200": { description: "upstream response" } },
        },
      },
      "/mcp": {
        post: {
          operationId: "mcp",
          summary: "MCP JSON-RPC for read-only azvpn tools",
          responses: { "200": { description: "JSON-RPC" } },
        },
      },
    },
  };
}

function mcpTools() {
  return [
    { name: "azvpn_health", description: "Tracker liveness. Does not open a session or enable mesh.", inputSchema: { type: "object", properties: {} } },
    { name: "azvpn_skill", description: "Skill markdown for AZVPN 0.1.0.", inputSchema: { type: "object", properties: {} } },
    { name: "azvpn_doctor", description: "Read-only self-check of this download tracker.", inputSchema: { type: "object", properties: {} } },
    { name: "azvpn_limitation", description: "Lab honesty text from this repository.", inputSchema: { type: "object", properties: {} } },
    { name: "azvpn_describe", description: "Read-only describe of the lab and this tracker.", inputSchema: { type: "object", properties: {} } },
  ];
}

function mcpInitialize() {
  return {
    protocolVersion: "2025-03-26",
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: "azvpn-download-tracker", version: VERSION },
    instructions: DOOR_NOTE + " Catalog MCP remains " + CATALOG_MCP + ". Do not rename aziel-runtime tools.",
  };
}

function readTool(name) {
  if (name === "azvpn_health" || name === "health") return healthBody();
  if (name === "azvpn_skill" || name === "skill") return { skill: SKILL };
  if (name === "azvpn_doctor" || name === "doctor") return doctorBody();
  if (name === "azvpn_limitation" || name === "limitation") return { ok: true, limitation: LIMITATION, version: VERSION };
  if (name === "azvpn_describe" || name === "describe") return describeBody();
  return null;
}

async function handleMcp(request) {
  if (request.method === "GET" || request.method === "HEAD") {
    const docs = {
      product: PRODUCT,
      version: VERSION,
      author: AUTHOR,
      protocol: "mcp",
      door: "fraggate",
      slug: PRODUCT,
      catalog_mcp: CATALOG_MCP,
      tools: mcpTools().map((t) => t.name),
      note: DOOR_NOTE,
    };
    if (request.method === "HEAD") return new Response(null, { status: 200, headers: corsHeaders() });
    return json(docs);
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const id = body && Object.prototype.hasOwnProperty.call(body, "id") ? body.id : null;
  const method = body && body.method;
  const params = (body && body.params) || {};
  if (method === "initialize") return json({ jsonrpc: "2.0", id, result: mcpInitialize() });
  if (method === "notifications/initialized" || method === "initialized") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (method === "ping") return json({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") return json({ jsonrpc: "2.0", id, result: { tools: mcpTools() } });
  if (method === "tools/call") {
    const name = params.name;
    const data = readTool(name);
    if (!data) {
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: false,
              code: "AZVPN-DOOR",
              error: "Unknown or non-local tool. Session ops go through FragGate slug azvpn. This Worker did not execute them.",
              agent_path: FRAGGATE_CALL,
              catalog_mcp: CATALOG_MCP,
            }, null, 2),
          }],
        },
      });
    }
    if (name === "azvpn_skill" || name === "skill") {
      return json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: SKILL }] } });
    }
    return json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] } });
  }
  return json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found. Use initialize, tools/list, tools/call." },
  });
}

function runtimeFetcher(env) {
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") return env.AZIEL_RUNTIME;
  return null;
}

async function proxyDoor(request, url, env) {
  const dest = doorTargetUrl(url.pathname, request.url, env);
  if (!dest) return json({ ok: false, error: "not a door path", path: url.pathname, door: "fraggate" }, 404);
  const headers = new Headers();
  const pass = ["content-type", "accept", "authorization", "user-agent", "mcp-protocol-version", "mcp-session-id"];
  for (const name of pass) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }
  if (!headers.has("user-agent") && !headers.has("User-Agent")) headers.set("User-Agent", "Mozilla/5.0 AZVPN/0.1.0");
  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }
  try {
    const fetcher = runtimeFetcher(env);
    const res = fetcher ? await fetcher.fetch(dest, init) : await fetch(dest, init);
    const outHeaders = new Headers();
    const ctype = res.headers.get("content-type");
    if (ctype) outHeaders.set("content-type", ctype);
    for (const [k, v] of Object.entries(corsHeaders())) outHeaders.set(k, v);
    outHeaders.set("X-Aziel-Door", "proxy");
    outHeaders.set("X-Aziel-Door-Origin", dest);
    outHeaders.set("Cache-Control", "private, no-store");
    return new Response(res.body, { status: res.status, headers: outHeaders });
  } catch (exc) {
    return json({
      ok: false,
      error: "fraggate_proxy_failed",
      detail: String(exc && exc.message ? exc.message : exc).slice(0, 240),
      origin: dest,
      agent_path: FRAGGATE_CALL,
      door: "fraggate",
      slug: PRODUCT,
      note: "The proxy failed. Nothing was enabled on this Worker.",
    }, 502);
  }
}

export async function handleRuntimeApi(request, url, env) {
  const stripped = url.pathname.replace(/\/+$/, "") || "/";
  if (stripped === "/mcp") return handleMcp(request);

  const classified = classifyV1Path(url.pathname);
  if (classified.kind === "door") return proxyDoor(request, url, env);

  const path = stripped;
  const isApi = path === "/v1" || path.startsWith("/v1/") || path === "/openapi.json";
  if (!isApi) return null;

  if (classified.kind === "multi") {
    return json({
      ok: false,
      error: "not a local op",
      code: "NOT_LOCAL_OP",
      path: classified.path,
      note: "Local reads are a single /v1/{op} segment. FragGate and mesh paths proxy to aziel-runtime and do not increment downloads.",
    }, 404);
  }

  if (path === "/openapi.json" && request.method === "GET") return json(openapiSpec());
  if (path === "/v1" && request.method === "GET") {
    return json({
      ok: true,
      product: PRODUCT,
      version: VERSION,
      read_ops: READ_OPS,
      door: "fraggate",
      note: DOOR_NOTE,
    });
  }
  if (request.method === "GET" && path === "/v1/health") return json(healthBody());
  if (request.method === "GET" && path === "/v1/skill") {
    return new Response(SKILL, {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "private, no-store", ...corsHeaders() },
    });
  }
  if (request.method === "GET" && path === "/v1/doctor") return json(doctorBody());
  if (request.method === "GET" && path === "/v1/limitation") {
    return json({ ok: true, product: PRODUCT, version: VERSION, author: AUTHOR, limitation: LIMITATION });
  }
  if (request.method === "GET" && path === "/v1/describe") return json(describeBody());

  if (classified.kind === "local" && classified.op) {
    const op = classified.op;
    if (request.method === "GET" && !READ_OPS.includes(op)) {
      return json({ ...doorRefusal(op), hint: "Use POST on the local lab or FragGate. GET does not enable this op." }, 405);
    }
    if (request.method === "POST") return json(doorRefusal(op), 400);
    if (request.method !== "GET") return json({ ok: false, code: "AZVPN-METHOD", note: "Method not allowed." }, 405);
  }

  return json({ error: "not found", product: PRODUCT, note: DOOR_NOTE }, 404);
}

export const RUNTIME_TEXT = { LIMITATION, MOTTO, VERSION, DOOR_NOTE };
