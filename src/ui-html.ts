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
      --ok: #1f6b45;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --ink: #f4efe4;
        --muted: #c8bfae;
        --bg: #12110e;
        --card: #1c1a16;
        --line: #3a342a;
        --ok: #8fd0a8;
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
    .status { margin: 0.4rem 0 0; font-weight: 620; }
    .status.on { color: var(--ok); }
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
    <h1>Rotate IP</h1>
    <p class="lead">The path is already up. Rotate builds a new circuit on this process. AZVPN stays on.</p>
    <p id="transport" class="status" aria-live="polite">Checking the path…</p>
    <section class="card">
      <button type="button" class="primary" id="rotate">Rotate IP</button>
      <p id="session-line" class="session-line"></p>
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
        <p class="hint">Rotate uses this path. Settings stay on this machine.</p>
        <label for="token">Token</label>
        <input id="token" autocomplete="off" placeholder="Only needed beyond this machine" />
        <div class="actions">
          <button type="button" class="ghost" id="doctor">Doctor</button>
        </div>
        <label for="out">Details</label>
        <pre id="out">Checking the path…</pre>
      </div>
    </details>
    <details class="fold">
      <summary>About</summary>
      <div class="fold-body">
        <p>${NAME} ${VERSION}. Author ${AUTHOR}.</p>
        <p>The path comes up with this process: onion hops, encrypted envelopes, and the hybrid handshake (X25519 + ML-KEM-768).</p>
        <p>Rotate builds a new circuit here. HTTPS is on only when this process is terminating TLS. ACME, WireGuard, OpenVPN, public Tor, SOCKS, and origin hiding stay SLOT.</p>
        <p><a href="${GITHUB}">${GITHUB}</a></p>
      </div>
    </details>
  </main>
  <script>
    var sessionId = null;
    var tlsOn = false;
    var out = document.getElementById("out");
    var transport = document.getElementById("transport");
    var sessionLine = document.getElementById("session-line");
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
      }).then(function (res) { return res.json(); }).catch(function () {
        return { ok: false, note: "The page could not reach AZVPN. Next: azvpn ui" };
      });
    }
    function say(el, text) { if (el) el.textContent = text; }
    function shapeOf(data) {
      if (!data) return "";
      if (data.circuit && data.circuit.shape) return data.circuit.shape;
      if (data.shape) return data.shape;
      return data.mode || "";
    }
    function tlsSuffix() {
      return tlsOn ? " This process is terminating TLS." : "";
    }
    function showOn(data, rebuilt) {
      var path = shapeOf(data) || "up";
      sessionId = data.session_id || sessionId;
      transport.className = "status on";
      say(transport, (rebuilt ? "ON. Path rebuilt: " : "ON. Path: ") + path + "." + tlsSuffix());
      say(sessionLine, "AZVPN stays on.");
      say(out, "Path " + path + (sessionId ? "\\n" + sessionId : ""));
    }
    function showRepair(reason) {
      transport.className = "status";
      var why = reason || "The path did not come up.";
      say(transport, "Repairing. " + why + " Next: Rotate IP.");
      say(sessionLine, "AZVPN stays on this page. Rotate builds the path again.");
      say(out, why);
    }
    function currentFrom(list) {
      var sessions = (list && list.sessions) || [];
      var open = sessions.filter(function (item) { return item && !item.closed; });
      return open.length ? open[open.length - 1] : null;
    }
    function refresh() {
      return call("list", {}).then(function (list) {
        if (!list || list.ok === false) {
          showRepair((list && list.note) || "The path did not answer.");
          return;
        }
        var current = currentFrom(list);
        if (!current) {
          showRepair("The path is not up yet.");
          return;
        }
        showOn(current, false);
      });
    }
    document.getElementById("rotate").addEventListener("click", function () {
      var previous = sessionId;
      var mode = document.getElementById("mode").value;
      call("open", { peer: "local", mode: mode }).then(function (data) {
        if (!data || data.ok === false) {
          if (previous) {
            say(transport, "ON. Rotate did not finish. " + ((data && data.note) || "The current path is still up."));
            transport.className = "status on";
            say(out, (data && data.note) || "Rotate did not finish.");
          } else {
            showRepair((data && data.note) || "Rotate did not finish.");
          }
          return;
        }
        var retire = previous && previous !== data.session_id
          ? call("close", { session_id: previous })
          : Promise.resolve(null);
        retire.then(function () {
          showOn(data, true);
        });
      });
    });
    document.getElementById("doctor").addEventListener("click", function () {
      call("doctor").then(function (data) {
        if (!data || data.ok === false) {
          showRepair((data && data.note) || "Doctor did not finish.");
          return;
        }
        var kinds = data.kinds || {};
        var lines = Object.keys(kinds).map(function (key) {
          var mark = kinds[key] === "REAL" ? "ok   " : "slot ";
          return mark + (kindLabels[key] || key);
        });
        say(out, lines.join("\\n"));
        if ((data.open_tunnels || 0) > 0) {
          transport.className = "status on";
          say(transport, "ON. Doctor finished. Paths up: " + data.open_tunnels + "." + tlsSuffix());
        } else {
          showRepair("Doctor finished. The path is not up yet.");
        }
      });
    });
    call("health").then(function (health) {
      tlsOn = Boolean(health && health.transport && health.transport.tls);
      if (!health || health.ok === false) {
        showRepair("The page could not read AZVPN. Next: azvpn ui");
        return;
      }
      return refresh();
    });
  </script>
</body>
</html>`;
}
