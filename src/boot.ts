import { AzvpnEngine, type EngineResult } from "./engine.js";
import type { SessionMode } from "./types.js";

export const BOOT_PEER = "local";
export const BOOT_MODE: SessionMode = "onion";

function asMode(value: string | undefined): SessionMode | undefined {
  if (value === "onion" || value === "http_ws" || value === "rendezvous") return value;
  return undefined;
}

export function openSessions(engine: AzvpnEngine) {
  return [...engine.sessions.values()].filter((session) => !session.closed);
}

/** Bring a path up when none is open. An existing open path is left as-is. */
export function ensurePath(engine: AzvpnEngine): EngineResult {
  const open = openSessions(engine);
  const current = open.at(-1);
  if (current) return engine.dispatch("status", { session_id: current.session_id });
  return engine.dispatch("open", { peer: BOOT_PEER, mode: BOOT_MODE });
}

/**
 * Build a new circuit and retire the previous open paths.
 * If the new circuit does not come up, the current path stays.
 */
export function rotatePath(
  engine: AzvpnEngine,
  opts: { mode?: string; peer?: string } = {},
): EngineResult {
  const previous = openSessions(engine).map((session) => session.session_id);
  const opened = engine.dispatch("open", {
    peer: opts.peer && opts.peer.trim() ? opts.peer.trim() : BOOT_PEER,
    mode: asMode(opts.mode) ?? BOOT_MODE,
  });
  if (opened.ok === false) return opened;
  for (const session_id of previous) engine.dispatch("close", { session_id });
  return opened;
}
