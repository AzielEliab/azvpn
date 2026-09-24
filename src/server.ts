import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";
import {
  assertBindPolicy,
  BindPolicyError,
  DEFAULT_BIND,
  DEFAULT_PORT,
  extractToken,
  tokenMatches,
  type BindPolicy,
} from "./bind.js";
import { AzvpnEngine } from "./engine.js";
import { resolveTlsRequest, TlsPolicyError, type TlsMaterial } from "./tls.js";
import { uiHtml } from "./ui-html.js";

const GET_OPS = new Set(["health", "doctor", "limitation", "skill", ""]);

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(data);
}

function authorize(req: IncomingMessage, policy: BindPolicy, url: URL): boolean {
  if (!policy.auth_required || !policy.token) return true;
  const provided = extractToken(req.headers, url.searchParams.get("token"));
  return tokenMatches(provided, policy.token);
}

export interface ServeOptions {
  host?: string;
  port?: number;
  engine?: AzvpnEngine;
  exposeNonLoopback?: boolean;
  token?: string;
  tls?: boolean;
  tlsCert?: string;
  tlsKey?: string;
  onChange?: () => void;
}

function attachHandler(
  server: HttpServer | HttpsServer,
  engine: AzvpnEngine,
  policy: BindPolicy,
  tlsOn: boolean,
  onChange?: () => void,
): void {
  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    const proto = tlsOn ? "https" : "http";
    const url = new URL(req.url ?? "/", `${proto}://${req.headers.host ?? DEFAULT_BIND}`);
    if (!authorize(req, policy, url)) {
      json(res, 401, {
        ok: false,
        code: "AZVPN-AUTH-FAIL",
        note: "Bearer token required (Authorization: Bearer … or x-azvpn-token). Query ?token= is accepted but leaks.",
      });
      return;
    }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/ui")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(uiHtml());
      return;
    }
    if (url.pathname === "/v1/ws") {
      json(res, 400, { ok: false, code: "AZVPN-WS-UPGRADE", note: "Use a WebSocket client with ticket query." });
      return;
    }
    const match = url.pathname.match(/^\/v1\/([a-z0-9_]+)$/);
    const op = match?.[1] ?? "";
    if (!op) {
      json(res, 404, { ok: false, code: "AZVPN-NOT-FOUND", note: url.pathname });
      return;
    }
    if (req.method === "GET" && !GET_OPS.has(op)) {
      json(res, 405, { ok: false, code: "AZVPN-METHOD", note: "Use POST for this op." });
      return;
    }
    let payload: Record<string, unknown> = {};
    if (req.method === "POST") {
      try {
        payload = await readBody(req);
      } catch {
        json(res, 400, { ok: false, code: "AZVPN-BAD-JSON", note: "Body must be JSON." });
        return;
      }
    }
    const result = engine.dispatch(op, payload);
    if (req.method === "POST") onChange?.();
    json(res, result.ok === false ? 400 : 200, result);
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const proto = tlsOn ? "https" : "http";
    const url = new URL(req.url ?? "/", `${proto}://${DEFAULT_BIND}`);
    if (!authorize(req, policy, url)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (url.pathname !== "/v1/ws") {
      socket.destroy();
      return;
    }
    const ticket = url.searchParams.get("ticket") ?? "";
    const rec = engine.findByTicket(ticket);
    if (!rec) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.send(
        JSON.stringify({
          ok: true,
          honesty: "REAL",
          op: "attach",
          session_id: rec.session_id,
          transport: tlsOn ? "https_ws" : "http_ws",
          tls: tlsOn,
          note: tlsOn
            ? "Same inbox. WSS on this process. Node TLS is classical (HN-DR). Not a second door. Not origin-hiding."
            : "Same inbox. Plain WS lab. Not TLS. Not a second door. Not origin-hiding.",
        }),
      );
      ws.on("message", (raw) => {
        const text = raw.toString();
        let payload: Record<string, unknown> = { session_id: rec.session_id, text };
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          payload = { ...parsed, session_id: rec.session_id };
        } catch {
          payload = { session_id: rec.session_id, text };
        }
        const result = engine.dispatch("send", payload);
        ws.send(JSON.stringify(result));
      });
    });
  });
}

export function createAzvpnServer(opts: ServeOptions = {}) {
  const tls = resolveTlsRequest({
    tls: opts.tls,
    certPath: opts.tlsCert,
    keyPath: opts.tlsKey,
  });
  const engine = opts.engine ?? new AzvpnEngine({ tlsTerminated: tls.enabled });
  engine.setTlsTerminated(tls.enabled);
  const policy = assertBindPolicy({
    host: opts.host ?? DEFAULT_BIND,
    exposeNonLoopback: opts.exposeNonLoopback,
    token: opts.token,
    tls: tls.enabled,
  });
  const server = tls.enabled
    ? createHttpsServer({ cert: tls.cert, key: tls.key })
    : createHttpServer();
  attachHandler(server, engine, policy, tls.enabled, opts.onChange);
  return { server, engine, policy, tls };
}

export function listen(
  opts: ServeOptions = {},
): Promise<{
  host: string;
  port: number;
  policy: BindPolicy;
  tls: TlsMaterial;
  close: () => Promise<void>;
}> {
  const host = opts.host ?? DEFAULT_BIND;
  const port = opts.port ?? DEFAULT_PORT;
  let created: ReturnType<typeof createAzvpnServer>;
  try {
    created = createAzvpnServer({ ...opts, host, engine: opts.engine });
  } catch (err) {
    return Promise.reject(err);
  }
  const { server, engine, policy, tls } = created;
  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const bound = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        host,
        port: bound,
        policy,
        tls,
        close: () =>
          new Promise((done, fail) => {
            server.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
    server.on("error", reject);
    void engine;
  });
}

export { BindPolicyError, TlsPolicyError };
