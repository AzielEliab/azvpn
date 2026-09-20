import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8 } from "./bytes.js";

export const MIN_TOKEN_LEN = 16;
export const DEFAULT_BIND = "127.0.0.1";
export const DEFAULT_PORT = 8787;

export class BindPolicyError extends Error {
  readonly code: string;
  readonly honesty = "SLOT" as const;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BindPolicyError";
    this.code = code;
  }

  toJSON() {
    return { ok: false as const, code: this.code, honesty: this.honesty, note: this.message };
  }
}

export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === "localhost" || h === "::1") return true;
  if (h.startsWith("[") && h.endsWith("]")) return isLoopbackHost(h.slice(1, -1));
  if (h.startsWith("::ffff:")) return isLoopbackHost(h.slice(7));
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) return v4[1] === "127";
  return false;
}

export function tokenMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = sha256(utf8(provided));
  const b = sha256(utf8(expected));
  return timingSafeEqual(a, b);
}

export interface BindRequest {
  host: string;
  exposeNonLoopback?: boolean;
  token?: string;
}

export interface BindPolicy {
  host: string;
  loopback: boolean;
  auth_required: boolean;
  token?: string;
  transport: "http_ws";
  tls: false;
  danger?: string;
}

export function assertBindPolicy(req: BindRequest): BindPolicy {
  const host = req.host.trim() || DEFAULT_BIND;
  const loopback = isLoopbackHost(host);
  const token = req.token?.trim() || undefined;

  if (!loopback && !req.exposeNonLoopback) {
    throw new BindPolicyError(
      "AZVPN-BIND-REFUSED",
      `Non-loopback bind ${host} refused. Default is 127.0.0.1. Pass --expose-non-loopback and --token (or AZVPN_TOKEN) to opt in. Danger: this lab HTTP/WS concentrator has no TLS and would be reachable off-box.`,
    );
  }
  if (!loopback && (!token || token.length < MIN_TOKEN_LEN)) {
    throw new BindPolicyError(
      "AZVPN-AUTH-REQUIRED",
      `Non-loopback bind ${host} requires a bearer token of at least ${MIN_TOKEN_LEN} characters (--token / AZVPN_TOKEN) plus --expose-non-loopback. Unauthenticated exposure is refused.`,
    );
  }
  if (token && token.length < MIN_TOKEN_LEN) {
    throw new BindPolicyError(
      "AZVPN-AUTH-WEAK",
      `Token must be at least ${MIN_TOKEN_LEN} characters.`,
    );
  }

  return {
    host,
    loopback,
    auth_required: Boolean(token),
    token,
    transport: "http_ws",
    tls: false,
    danger: loopback
      ? undefined
      : "Non-loopback HTTP/WS lab bind. Not TLS. Token required. Query ?token= leaks in logs and Referer. Prefer loopback.",
  };
}

export function extractToken(headers: IncomingHttpHeaders, queryToken?: string | null): string | undefined {
  const auth = header(headers, "authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const named = header(headers, "x-azvpn-token");
  if (named) return named.trim();
  if (queryToken) return queryToken;
  return undefined;
}

function header(headers: IncomingHttpHeaders, name: string): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}
