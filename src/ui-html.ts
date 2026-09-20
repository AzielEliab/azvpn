import { AUTHOR, GITHUB, NAME, VERSION } from "./types.js";
import { LIMITATION, MOTTO } from "./honesty.js";

export function uiHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${NAME} — concentrator + onion</title>
  <style>
    :root { color-scheme: dark; --ink:#f5f5f0; --gold:#d4af37; --slot:#c45c26; --real:#7dcea0; --bg:#0b0b0b; --panel:#141414; }
    * { box-sizing: border-box; }
    body { margin:0; font:16px/1.45 ui-sans-serif, system-ui, sans-serif; background:var(--bg); color:var(--ink); }
    header, main, footer { max-width:920px; margin:0 auto; padding:1.25rem; }
    header { border-bottom:1px solid #2a2a2a; }
    h1 { font-size:1.6rem; letter-spacing:.04em; margin:0 0 .35rem; color:var(--gold); }
    .motto { color:#c8c8c0; }
    .badges { display:flex; flex-wrap:wrap; gap:.4rem; margin:.8rem 0; }
    .badge { border:1px solid #333; padding:.15rem .5rem; font-size:.75rem; letter-spacing:.04em; }
    .REAL { border-color:var(--real); color:var(--real); }
    .SLOT { border-color:var(--slot); color:var(--slot); }
    .panel { background:var(--panel); border:1px solid #222; padding:1rem; margin:1rem 0; }
    label { display:block; margin:.4rem 0 .2rem; font-size:.85rem; color:#bbb; }
    input, select, textarea, button { font:inherit; }
    input, select, textarea { width:100%; background:#0f0f0f; color:var(--ink); border:1px solid #333; padding:.45rem .55rem; }
    button { background:var(--gold); color:#111; border:0; padding:.5rem .8rem; margin:.3rem .3rem 0 0; cursor:pointer; }
    button.ghost { background:transparent; color:var(--ink); border:1px solid #444; }
    pre { white-space:pre-wrap; word-break:break-word; background:#080808; padding:.75rem; border:1px solid #222; min-height:6rem; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
    @media (max-width:700px) { .row { grid-template-columns:1fr; } }
    footer { color:#777; font-size:.85rem; border-top:1px solid #2a2a2a; }
    a { color:var(--gold); }
  </style>
</head>
<body>
  <header>
    <h1>${NAME}</h1>
    <p class="motto">${MOTTO}</p>
    <div class="badges">
      <span class="badge REAL">HTTP/WS lab REAL</span>
      <span class="badge REAL">onion layering REAL</span>
      <span class="badge REAL">hybrid PQC REAL</span>
      <span id="tls-badge" class="badge SLOT">HTTPS/TLS SLOT unless this process terminates TLS</span>
      <span class="badge SLOT">ACME SLOT</span>
      <span class="badge SLOT">WireGuard SLOT</span>
      <span class="badge SLOT">public Tor SLOT</span>
      <span class="badge SLOT">origin-hiding SLOT</span>
      <span class="badge SLOT">NOT_QUANTUM_PROOF residuals</span>
    </div>
    <p>v${VERSION} · Author ${AUTHOR} only · <a href="${GITHUB}">${GITHUB}</a></p>
  </header>
  <main>
    <section class="panel">
      <p>${LIMITATION.replace(/</g, "&lt;")}</p>
    </section>
    <section class="panel">
      <div class="row">
        <div>
          <label for="peer">Peer</label>
          <input id="peer" value="alice" />
          <label for="mode">Mode</label>
          <select id="mode">
            <option value="http_ws">http_ws (lab concentrator, not TLS)</option>
            <option value="onion" selected>onion (entry → middle → exit)</option>
            <option value="rendezvous">rendezvous (entry → middle → rend)</option>
          </select>
          <label for="token">Bearer token (required off-loopback)</label>
          <input id="token" placeholder="loopback needs none" autocomplete="off" />
          <label for="text">Message</label>
          <textarea id="text" rows="3">hello from AZVPN</textarea>
          <button id="connect">Connect</button>
          <button id="send">Send</button>
          <button id="recv">Recv</button>
          <button id="circuit">Circuit</button>
          <button class="ghost" id="close">Close</button>
          <button class="ghost" id="doctor">Doctor</button>
        </div>
        <div>
          <label>Session / circuit</label>
          <pre id="status">No session. Connect does not invent a public Tor overlay.</pre>
        </div>
      </div>
    </section>
    <section class="panel">
      <label>Receipt</label>
      <pre id="out">Ready.</pre>
    </section>
  </main>
  <footer>
    Standalone public product. Lumen stays private. HTTPS is REAL only when this process terminates TLS. Loopback default. No latency theater. No “untraceable proven.”
  </footer>
  <script>
    let sessionId = null;
    const out = document.getElementById("out");
    const status = document.getElementById("status");
    const q = new URLSearchParams(location.search);
    const tokenBox = document.getElementById("token");
    if (q.get("token") && tokenBox && !tokenBox.value) tokenBox.value = q.get("token");
    function headers() {
      const h = { "content-type": "application/json", "user-agent": "Mozilla/5.0" };
      const t = tokenBox && tokenBox.value.trim();
      if (t) h["x-azvpn-token"] = t;
      return h;
    }
    async function call(op, body = {}) {
      const res = await fetch("/v1/" + op, {
        method: op === "health" || op === "doctor" || op === "limitation" || op === "skill" ? "GET" : "POST",
        headers: headers(),
        body: (op === "health" || op === "doctor" || op === "limitation" || op === "skill") ? undefined : JSON.stringify(body)
      });
      return res.json();
    }
    function show(el, data) { el.textContent = JSON.stringify(data, null, 2); }
    document.getElementById("connect").onclick = async () => {
      const data = await call("open", { peer: document.getElementById("peer").value, mode: document.getElementById("mode").value });
      sessionId = data.session_id || null;
      show(out, data);
      show(status, data.circuit || data);
    };
    document.getElementById("send").onclick = async () => {
      show(out, await call("send", { session_id: sessionId, text: document.getElementById("text").value }));
    };
    document.getElementById("recv").onclick = async () => {
      show(out, await call("recv", { session_id: sessionId }));
    };
    document.getElementById("circuit").onclick = async () => {
      const data = await call("circuit", { session_id: sessionId });
      show(out, data);
      show(status, data.circuit || data);
    };
    document.getElementById("close").onclick = async () => {
      show(out, await call("close", { session_id: sessionId }));
    };
    document.getElementById("doctor").onclick = async () => {
      show(out, await call("doctor"));
    };
    call("health").then((h) => {
      const badge = document.getElementById("tls-badge");
      if (!badge) return;
      if (h && h.transport && h.transport.tls) {
        badge.className = "badge REAL";
        badge.textContent = "HTTPS/TLS REAL (this process terminates TLS)";
      }
    }).catch(() => undefined);
  </script>
</body>
</html>`;
}
