import { AUTHOR, GITHUB, NAME, VERSION } from "./types.js";

export function uiHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${NAME}</title>
  <style>
    :root {
      color-scheme: light dark;
      --gold: #c9a227;
      --ink: #1c1914;
      --muted: #4e483f;
      --bg: #f4f0e6;
      --card: #fffdf8;
      --line: #e3d9c6;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --ink: #f4efe4;
        --muted: #c8bfae;
        --bg: #12110e;
        --card: #1c1a16;
        --line: #3a342a;
      }
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--ink);
    }
    header, main { max-width: 40rem; margin: 0 auto; padding: 0 1.25rem; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
      padding-top: 1.35rem;
    }
    main { padding-bottom: 3rem; }
    h1 { font-size: 1.85rem; font-weight: 620; letter-spacing: -0.02em; margin: 0.35rem 0 0.4rem; }
    h2 { font-size: 1.05rem; font-weight: 620; margin: 0; }
    .brand { font-weight: 650; letter-spacing: 0.04em; }
    .mark {
      display: inline-block;
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 99px;
      background: var(--gold);
      margin-right: 0.4rem;
      transform: translateY(-0.05rem);
    }
    .by, .lead, .hint, .session-line { color: var(--muted); }
    .lead { margin: 0 0 0.85rem; }
    .status { margin: 0 0 0.25rem; }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 1.15rem 1.15rem 1.2rem;
      margin: 1rem 0;
    }
    label { display: block; margin: 0.85rem 0 0.35rem; }
    input, select, textarea, button { font: inherit; }
    input, select, textarea {
      width: 100%;
      color: var(--ink);
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0.65rem 0.75rem;
    }
    button {
      border-radius: 10px;
      padding: 0.7rem 1rem;
      margin-top: 0.95rem;
      min-height: 44px;
      cursor: pointer;
    }
    button.primary {
      background: var(--gold);
      color: #1a1608;
      border: 1px solid transparent;
      font-weight: 650;
    }
    button.ghost {
      background: transparent;
      color: var(--ink);
      border: 1px solid var(--line);
      font-weight: 560;
    }
    :focus-visible {
      outline: 2px solid var(--gold);
      outline-offset: 3px;
    }
    .actions { display: flex; flex-direction: column; gap: 0.55rem; margin-top: 0.4rem; }
    .actions button { margin-top: 0; }
    .fold { border-top: 1px solid var(--line); }
    summary { cursor: pointer; font-weight: 620; padding: 0.9rem 0; }
    .fold-body { padding: 0 0 1rem; }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: var(--bg);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0.75rem;
      min-height: 4.5rem;
      margin: 0.35rem 0 0;
    }
    .session-line { overflow-wrap: anywhere; margin: 0.85rem 0 0; }
    a { color: inherit; }
    [hidden] { display: none !important; }
    @media (max-width: 480px) {
      header, main { padding-left: 1rem; padding-right: 1rem; }
      h1 { font-size: 1.55rem; }
      button.primary, button.ghost { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand"><span class="mark" aria-hidden="true"></span>${NAME}</div>
    <div class="by">${AUTHOR}</div>
  </header>
  <main>
    <h1>Open a session</h1>
    <p class="lead">Send a message on this computer. Onion hops run in this process when you choose them.</p>
    <p id="transport" class="status" aria-live="polite">Checking this process…</p>
    <section class="card">
      <form id="open-form">
        <label for="peer">Peer name</label>
        <input id="peer" name="peer" value="alice" autocomplete="off" />
        <button type="submit" class="primary" id="connect">Open session</button>
      </form>
      <p id="session-line" class="session-line">No session yet.</p>
    </section>
    <section class="card" id="composer" hidden>
      <h2>Message</h2>
      <label for="text">Text</label>
      <textarea id="text" rows="3">hello</textarea>
      <button type="button" id="send">Send</button>
      <p id="inbox" class="session-line"></p>
    </section>
    <details class="fold" id="advanced">
      <summary>Advanced</summary>
      <div class="fold-body">
        <label for="mode">Path</label>
        <select id="mode">
          <option value="onion" selected>Onion hops</option>
          <option value="http_ws">Direct lab</option>
          <option value="rendezvous">Rendezvous</option>
        </select>
        <p class="hint">Onion hops and rendezvous stay inside this process.</p>
        <label for="token">Token</label>
        <input id="token" autocomplete="off" placeholder="Only needed off this machine" />
        <div class="actions">
          <button type="button" class="ghost" id="recv">Read messages</button>
          <button type="button" class="ghost" id="circuit">Show path</button>
          <button type="button" class="ghost" id="close">Close session</button>
          <button type="button" class="ghost" id="doctor">Doctor</button>
        </div>
        <label for="out">Details</label>
        <pre id="out">Ready when you are.</pre>
      </div>
    </details>
    <details class="fold">
      <summary>About</summary>
      <div class="fold-body">
        <p>${NAME} ${VERSION}. Author ${AUTHOR}.</p>
        <p>Working on this process: the local HTTP and WebSocket lab, encrypted envelopes, onion hops, the hybrid handshake (X25519 + ML-KEM-768), and local rendezvous.</p>
        <p>HTTPS is on only when this process is terminating TLS. ACME, WireGuard, OpenVPN, public Tor, SOCKS, and origin hiding stay SLOT.</p>
        <p><a href="${GITHUB}">${GITHUB}</a></p>
      </div>
    </details>
  </main>
  <noscript><p class="lead">From a terminal: azvpn ui, then azvpn open --peer alice.</p></noscript>
  <script>
    var sessionId = null;
    var out = document.getElementById("out");
    var transport = document.getElementById("transport");
    var sessionLine = document.getElementById("session-line");
    var inbox = document.getElementById("inbox");
    var composer = document.getElementById("composer");
    var connect = document.getElementById("connect");
    var tokenBox = document.getElementById("token");
    var q = new URLSearchParams(location.search);
    if (q.get("token") && tokenBox && !tokenBox.value) tokenBox.value = q.get("token");

    var kindLabels = {
      http_ws: "HTTP and WebSocket lab",
      https_ws: "HTTPS on this process",
      https_tls: "TLS termination on this process",
      fraggate_envelopes: "Encrypted envelopes",
      websocket_attach: "WebSocket attach",
      onion_circuit_layering: "Onion circuits in this process",
      hybrid_pqc_handshake: "Hybrid handshake",
      rendezvous_join: "Local rendezvous",
      wireguard: "WireGuard",
      openvpn: "OpenVPN",
      l3_exit_pool: "L3 exit pool",
      kernel_udp: "Kernel UDP",
      tun_tap: "TUN and TAP",
      socks: "SOCKS",
      tor_public_network: "Public Tor",
      origin_hiding: "Origin hiding"
    };

    function headers() {
      var h = { "content-type": "application/json", "user-agent": "Mozilla/5.0" };
      var t = tokenBox && tokenBox.value.trim();
      if (t) h["x-azvpn-token"] = t;
      return h;
    }
    function isRead(op) {
      return op === "health" || op === "doctor" || op === "limitation" || op === "skill";
    }
    function call(op, body) {
      return fetch("/v1/" + op, {
        method: isRead(op) ? "GET" : "POST",
        headers: headers(),
        body: isRead(op) ? undefined : JSON.stringify(body || {})
      }).then(function (res) {
        return res.json();
      }).catch(function () {
        return { ok: false, note: "The page could not reach AZVPN. Start it again with azvpn ui." };
      });
    }
    function say(el, text) { if (el) el.textContent = text; }
    function shapeOf(data) {
      if (data && data.circuit && data.circuit.shape) return data.circuit.shape;
      return data && data.mode ? data.mode : "";
    }
    function showProblem(data) {
      var reason = (data && data.note) ? data.note : "That did not work.";
      say(sessionLine, reason);
      say(out, reason);
    }
    function markOpen(isOpen) {
      connect.className = isOpen ? "ghost" : "primary";
      connect.textContent = isOpen ? "Open another session" : "Open session";
      document.getElementById("send").className = isOpen ? "primary" : "";
      composer.hidden = !isOpen;
    }
    document.getElementById("open-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var peer = document.getElementById("peer").value.trim();
      if (!peer) {
        say(sessionLine, "Enter a peer name, then open the session.");
        return;
      }
      call("open", { peer: peer, mode: document.getElementById("mode").value }).then(function (data) {
        if (!data || data.ok === false) { showProblem(data); return; }
        sessionId = data.session_id || null;
        markOpen(true);
        say(sessionLine, "Session open with " + (data.peer || peer) + ". Path: " + shapeOf(data) + ".");
        say(out, "Session " + sessionId);
        say(inbox, "");
      });
    });
    document.getElementById("send").addEventListener("click", function () {
      if (!sessionId) { say(sessionLine, "Open a session first."); return; }
      var text = document.getElementById("text").value;
      if (!text) { say(inbox, "Write a message, then send it."); return; }
      call("send", { session_id: sessionId, text: text }).then(function (data) {
        if (!data || data.ok === false) { showProblem(data); return; }
        say(inbox, "Message queued.");
        say(out, "Queued on " + sessionId + " (" + (data.layers || 1) + " layers).");
      });
    });
    document.getElementById("recv").addEventListener("click", function () {
      if (!sessionId) { say(sessionLine, "Open a session first."); return; }
      call("recv", { session_id: sessionId }).then(function (data) {
        if (!data || data.ok === false) { showProblem(data); return; }
        var items = data.envelopes || [];
        if (!items.length) { say(inbox, "No messages waiting."); say(out, "Inbox empty."); return; }
        var lines = items.map(function (item) { return item.text || ""; }).filter(Boolean);
        say(inbox, lines.join("\\n") || "Message received.");
        say(out, lines.length + " message" + (lines.length === 1 ? "" : "s") + " read.");
      });
    });
    document.getElementById("circuit").addEventListener("click", function () {
      if (!sessionId) { say(sessionLine, "Open a session first."); return; }
      call("circuit", { session_id: sessionId }).then(function (data) {
        if (!data || data.ok === false) { showProblem(data); return; }
        var path = shapeOf(data);
        say(sessionLine, "Path: " + path + ".");
        say(out, path);
      });
    });
    document.getElementById("close").addEventListener("click", function () {
      if (!sessionId) { say(sessionLine, "Open a session first."); return; }
      call("close", { session_id: sessionId }).then(function (data) {
        if (!data || data.ok === false) { showProblem(data); return; }
        say(sessionLine, "Session closed.");
        say(out, "Closed " + sessionId);
        sessionId = null;
        markOpen(false);
        say(inbox, "");
      });
    });
    document.getElementById("doctor").addEventListener("click", function () {
      call("doctor").then(function (data) {
        if (!data || data.ok === false) { showProblem(data); return; }
        var kinds = data.kinds || {};
        var lines = Object.keys(kinds).map(function (key) {
          var mark = kinds[key] === "REAL" ? "ok   " : "slot ";
          return mark + (kindLabels[key] || key);
        });
        say(out, lines.join("\\n"));
        say(transport, "Doctor finished. Open sessions: " + (data.open_tunnels || 0) + ".");
      });
    });
    call("health").then(function (h) {
      if (!h || h.ok === false) {
        say(transport, "AZVPN did not answer. Start it again with azvpn ui.");
        return;
      }
      if (h.transport && h.transport.tls) {
        say(transport, "Ready. This process is terminating TLS.");
      } else {
        say(transport, "Ready. This page is the local HTTP lab.");
      }
    });
  </script>
</body>
</html>`;
}
