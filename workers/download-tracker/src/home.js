/**
 * AZVPN download landing.
 * Author: Aziel Eliab only. Apache-2.0. Forks welcome.
 * Version 0.1.0 matches package.json. No invented release and no public score.
 */

export const VERSION = "0.1.0";
export const AUTHOR = "Aziel Eliab";
export const PRODUCT = "AZVPN";
export const HOST = "https://azvpn-download-tracker.vibelock.workers.dev";
export const GITHUB_REPO = "https://github.com/AzielEliab/azvpn";
export const DEFAULT_ASSET = "azvpn-0.1.0.tar.gz";
export const DESCRIPTION =
  "HTTP/WS lab concentrator with optional Node TLS terminate and in-process onion circuits.";

export const THEME = {
  dark: {
    bg: "#12110e",
    ink: "#f6f1e7",
    muted: "#d4cbbd",
    line: "#3c362c",
    card: "#1c1a16",
    btnBg: "#f6f1e7",
    btnInk: "#1a1408",
    focus: "#ffe08a",
  },
  light: {
    bg: "#f7f4ee",
    ink: "#1c1914",
    muted: "#3f382e",
    line: "#d5ccbf",
    card: "#fffdf8",
    btnBg: "#1c1914",
    btnInk: "#f7f4ee",
    focus: "#5c4510",
  },
};

const LICENSE = "https://www.apache.org/licenses/LICENSE-2.0";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev/";
const HOW_TO_CITE =
  "Eliab, Aziel. (2026). AZVPN 0.1.0 [Software]. Apache-2.0. https://github.com/AzielEliab/azvpn";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, User-Agent, Authorization",
  };
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function css() {
  const d = THEME.dark;
  const l = THEME.light;
  return `
    :root {
      color-scheme: dark;
      --bg: ${d.bg};
      --ink: ${d.ink};
      --muted: ${d.muted};
      --line: ${d.line};
      --card: ${d.card};
      --btn-bg: ${d.btnBg};
      --btn-ink: ${d.btnInk};
      --focus: ${d.focus};
    }
    @media (prefers-color-scheme: light) {
      :root {
        color-scheme: light;
        --bg: ${l.bg};
        --ink: ${l.ink};
        --muted: ${l.muted};
        --line: ${l.line};
        --card: ${l.card};
        --btn-bg: ${l.btnBg};
        --btn-ink: ${l.btnInk};
        --focus: ${l.focus};
      }
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); }
    body {
      font: 1.0625rem/1.5 system-ui, "Segoe UI", sans-serif;
    }
    a { color: inherit; }
    .skip {
      position: absolute;
      left: 0.75rem;
      top: -4rem;
      background: var(--btn-bg);
      color: var(--btn-ink);
      padding: 0.6rem 0.9rem;
      border-radius: 8px;
      z-index: 2;
    }
    .skip:focus, .skip:focus-visible { top: 0.75rem; }
    a:focus-visible, button:focus-visible, summary:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 3px;
    }
    .wrap { max-width: 40rem; margin: 0 auto; padding: 1.25rem 1.15rem 3rem; }
    @media (min-width: 800px) {
      .wrap { max-width: 52rem; padding: 2.5rem 1.5rem 4rem; }
    }
    h1 { font-size: 2.6rem; line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 0.6rem; }
    @media (min-width: 800px) { h1 { font-size: 3.4rem; } }
    h2 { font-size: 1.15rem; margin: 0 0 0.75rem; }
    .lede { margin: 0 0 1.25rem; font-size: 1.15rem; max-width: 38rem; }
    .dl {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 3.4rem;
      padding: 0.9rem 1.3rem;
      border-radius: 12px;
      background: var(--btn-bg);
      color: var(--btn-ink);
      text-decoration: none;
      font-weight: 700;
      font-size: 1.2rem;
      letter-spacing: 0.01em;
    }
    @media (min-width: 800px) {
      .dl { width: auto; min-width: 16rem; display: inline-flex; }
    }
    .os, .quiet { color: var(--muted); margin: 0.85rem 0 0; }
    .section { margin-top: 2.2rem; }
    .features { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
    @media (min-width: 800px) {
      .features { grid-template-columns: 1fr 1fr; }
    }
    .features li {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0.9rem 1rem;
    }
    .features h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .features p { margin: 0; color: var(--muted); }
    figure { margin: 0; }
    figure img {
      width: 100%;
      height: auto;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: var(--card);
    }
    figcaption { color: var(--muted); margin-top: 0.55rem; font-size: 0.95rem; }
    code, pre { font-family: ui-monospace, Menlo, Consolas, monospace; }
    pre {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0.8rem 0.9rem;
      overflow: auto;
      font-size: 0.86rem;
      margin: 0.8rem 0 0;
    }
    details { margin-top: 0.9rem; }
    summary { cursor: pointer; }
    footer {
      margin-top: 2.4rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.95rem;
    }
    footer p { margin: 0.35rem 0; }
    footer a { text-underline-offset: 0.15em; }
    .countline { font-variant-numeric: tabular-nums; }
  `;
}

export function citePayload() {
  return {
    author: AUTHOR,
    title: PRODUCT,
    version: VERSION,
    homepage: HOST + "/",
    github: GITHUB_REPO,
    download: HOST + "/download",
    install: HOST + "/install.sh",
    openapi: HOST + "/openapi.json",
    skill: HOST + "/v1/skill",
    mcp: HOST + "/mcp",
    catalog: CATALOG,
    license: "Apache-2.0",
    license_url: LICENSE,
    one_line: DESCRIPTION,
    asset: DEFAULT_ASSET,
    how_to_cite: HOW_TO_CITE,
    zenodo_status: "no_doi_invented",
    note: "Version 0.1.0 is package.json. The archive is built from this repository. GitHub Releases has no asset. Identity is Aziel Eliab only. Forks welcome.",
  };
}

function sitemapXml() {
  const paths = ["/", "/download", "/install.sh", "/v1/skill", "/v1/health", "/openapi.json", "/mcp", "/cite.json", "/llms.txt"];
  const urls = paths.map((p) => `  <url><loc>${HOST}${p === "/" ? "/" : p}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
  <url><loc>${GITHUB_REPO}</loc></url>
</urlset>
`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${HOST}/sitemap.xml
`;
}

function llmsTxt() {
  return `# AZVPN

Author: Aziel Eliab
One-line: ${DESCRIPTION}
Version: ${VERSION}
GitHub: ${GITHUB_REPO}
Homepage: ${HOST}/
Download: ${HOST}/download
Asset: ${DEFAULT_ASSET} (source archive from this repository; package.json ${VERSION})
Install: ${HOST}/install.sh
OpenAPI: ${HOST}/openapi.json
Skill: ${HOST}/v1/skill
MCP: ${HOST}/mcp
Catalog: ${CATALOG}mcp (FragGate slug azvpn)
Cite: ${HOST}/cite.json
Lab: npx tsx src/cli.ts serve then http://127.0.0.1:8787
Counts: project|owner|repo|branch|fork. /v1 does not increment.
Identity: Aziel Eliab only
License: Apache-2.0
Forks: welcome and always allowed
DOI: none invented.
`;
}

export function handleSeoRoutes(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const headers = { ...corsHeaders(), "Cache-Control": "private, no-store" };
  if (url.pathname === "/cite.json") {
    return new Response(JSON.stringify(citePayload(), null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
    });
  }
  if (url.pathname === "/sitemap.xml") {
    return new Response(sitemapXml(), {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8", ...headers },
    });
  }
  if (url.pathname === "/robots.txt") {
    return new Response(robotsTxt(), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
    });
  }
  if (url.pathname === "/llms.txt" || url.pathname === "/ai.txt") {
    return new Response(llmsTxt(), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
    });
  }
  return null;
}

function breakdownList(stats) {
  const rows = stats.breakdown || [];
  if (!rows.length) return "<li>No downloads yet.</li>";
  return rows
    .map((b) => `<li><code>${escapeHtml(b.owner)}/${escapeHtml(b.repo)}</code> branch <code>${escapeHtml(b.branch)}</code> fork=${escapeHtml(b.fork)} → ${escapeHtml(b.count)}</li>`)
    .join("");
}

export function renderHome(stats) {
  const downloads = Number(stats.downloads != null ? stats.downloads : stats.total) || 0;
  const n = downloads.toLocaleString("en-US");
  const gh = stats.github || {};
  const releaseAssets = Number(gh.release_asset_count) || 0;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AZVPN</title>
<meta name="description" content="${escapeHtml(DESCRIPTION)}">
<meta name="author" content="${AUTHOR}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="${THEME.dark.bg}" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="${THEME.light.bg}" media="(prefers-color-scheme: light)">
<link rel="canonical" href="${HOST}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${css()}</style>
</head>
<body>
  <a class="skip" href="#download">Skip to download</a>
  <div class="wrap">
    <header class="hero">
      <h1>AZVPN</h1>
      <p class="lede">${escapeHtml(DESCRIPTION)}</p>
      <a class="dl" id="download" href="/download">Download</a>
      <p class="os" id="os-line">Node.js 20 or newer. One source archive, version ${VERSION}, for macOS, Linux, and Windows.</p>
    </header>
    <main>
      <section class="section" aria-labelledby="features-heading">
        <h2 id="features-heading">Features</h2>
        <ul class="features">
          <li>
            <h3>Loopback lab</h3>
            <p><code>npx tsx src/cli.ts serve</code> listens on 127.0.0.1:8787 with HTTP and WebSocket.</p>
          </li>
          <li>
            <h3>Encrypted envelopes</h3>
            <p>Open, send, and recv use session envelopes. Attach joins the same inbox.</p>
          </li>
          <li>
            <h3>Onion circuits</h3>
            <p>In-process entry, middle, and exit, plus a local rendezvous join.</p>
          </li>
          <li>
            <h3>Hybrid handshake</h3>
            <p>X25519 and ML-KEM-768. A classical-only handshake fails closed.</p>
          </li>
        </ul>
      </section>
      <section class="section" aria-labelledby="preview-heading">
        <h2 id="preview-heading">Lab preview</h2>
        <figure>
          <img src="/lab-ui.png" width="1280" height="900" alt="AZVPN lab page with peer, mode, and message fields, Connect and Send controls, and the HTTP/WS and onion labels from this repository.">
          <figcaption>The lab UI shipped in version ${VERSION}. After install it runs on this computer at 127.0.0.1:8787. Pass a cert and key when you want this process to terminate TLS.</figcaption>
        </figure>
      </section>
      <section class="section" aria-labelledby="count-heading">
        <h2 id="count-heading">Counted downloads</h2>
        <p class="countline">${escapeHtml(n)} downloads on this Worker, summed across branches and forks.</p>
        <p class="quiet">Archive ${escapeHtml(DEFAULT_ASSET)}. Version ${VERSION} is the version in package.json. GitHub Releases lists ${escapeHtml(releaseAssets)} assets. Stars ${escapeHtml(gh.stars || 0)} · forks ${escapeHtml(gh.forks || 0)}.</p>
        <pre id="install-cmd">curl -fsSL -A 'Mozilla/5.0' ${HOST}/install.sh | bash</pre>
        <details>
          <summary>Per owner, repo, branch, and fork</summary>
          <ul>${breakdownList(stats)}</ul>
        </details>
      </section>
    </main>
    <footer>
      <p>Apache-2.0 · ${AUTHOR} · AZVPN ${VERSION}</p>
      <p><a href="${GITHUB_REPO}">GitHub</a> · <a href="/v1/skill">Skill</a> · <a href="/openapi.json">OpenAPI</a> · <a href="/mcp">MCP</a> · <a href="/count">Count</a></p>
    </footer>
  </div>
  <script>
    (function () {
      var ua = navigator.userAgent || "";
      var os = "this computer";
      if (/Windows/i.test(ua)) os = "Windows";
      else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
      else if (/Android/i.test(ua)) os = "Android";
      else if (/Linux/i.test(ua)) os = "Linux";
      var line = document.getElementById("os-line");
      if (line) {
        line.textContent = "Detected " + os + ". One Node.js 20 archive (v${VERSION}) for macOS, Linux, and Windows. Extract it, run npm install, then npx tsx src/cli.ts serve and open http://127.0.0.1:8787.";
      }
      var cmd = document.getElementById("install-cmd");
      if (cmd && location && location.origin) {
        cmd.textContent = "curl -fsSL -A 'Mozilla/5.0' " + location.origin + "/install.sh | bash";
      }
    })();
  </script>
</body>
</html>`;
}
