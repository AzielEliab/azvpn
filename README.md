# AZVPN

Standalone **HTTPS/WebSocket concentrator** with **in-process onion routing**
(entry → middle → exit / rendezvous). Hybrid PQC handshake designed as
X25519 + ML-KEM-768.

**Author:** Aziel Eliab only  
**Date:** September 2026 · v0.1.0  
**License:** [Apache-2.0](LICENSE)  
**Specs:** [docs/AZVPN-SPEC.md](docs/AZVPN-SPEC.md)

Public Softwares product. Sister private Lumen may adapter-pair later; this
repo is standalone and holds **no Lumen canon**.

**Forks are welcome and always allowed.**

## Honesty

| Path | Label |
|------|--------|
| HTTPS / WebSocket concentrator | **REAL** |
| Encrypted envelopes + WS attach | **REAL** |
| Onion circuit layering (in-process) | **REAL** |
| Hybrid PQC handshake (X25519 + ML-KEM-768) | **REAL** |
| Local rendezvous join | **REAL** |
| WireGuard / OpenVPN / L3 / TUN / TAP | **SLOT** |
| Public Tor directory / exit / SOCKS | **SLOT** |
| Origin-hiding / “untraceable proven” | **SLOT** |

`NOT_QUANTUM_PROOF` residuals stay labeled (host TLS, metadata, Grover on
the AEAD). No latency theater.

## Quick start

```bash
npm install
npm test
npx tsx src/cli.ts open --peer alice --mode onion
npx tsx src/cli.ts serve
```

Open http://127.0.0.1:8787 (loopback by default).

```bash
npx tsx src/cli.ts health
npx tsx src/cli.ts doctor
npx tsx src/cli.ts limitation
npx tsx src/cli.ts open --peer alice --mode onion
npx tsx src/cli.ts send --id sess_… --text hello
npx tsx src/cli.ts recv --id sess_…
npx tsx src/cli.ts circuit --id sess_…
```

State file: `./.azvpn-state.json` (override with `--state` or `AZVPN_STATE`).
Treat it as local secrets.

## Library

```ts
import { createEngine } from "azvpn";

const azvpn = createEngine();
azvpn.dispatch("open", { peer: "alice", mode: "onion" });
```

## Catalog neighbor

FragGate slug `azvpn` on [aziel-runtime](https://github.com/AzielEliab/aziel-runtime)
remains the in-runtime concentrator cite (`AZVPN-CONCENTRATOR-1.0`). This
repository is the **standalone** public product (GitHub
https://github.com/AzielEliab/azvpn). No product Worker hostname is invented
here.

Always send `User-Agent: Mozilla/5.0` when calling hosted catalog routes.

## Cross-links

- [AZNet](https://github.com/AzielEliab/aznet) — pairing stays order/token; not this concentrator
- [AZBrowser](https://github.com/AzielEliab/azbrowser) — may auto-bind catalog AZVPN
- [FragGate](https://github.com/AzielEliab/fraggate) — one public door for catalog ops
- [aziel-runtime](https://github.com/AzielEliab/aziel-runtime)

Do **not** clone or dump private Lumen into this tree.

## Honest banner

THIS IS: an application-layer HTTPS/WS concentrator plus in-process multi-hop
onion circuits with a designed hybrid PQC handshake.

THIS IS NOT: a kernel VPN, a public Tor overlay, SOCKS, origin-hiding fabric,
or an untraceable proof.

Cite the GitHub repository. No Zenodo DOI is invented here.

Apache-2.0. Forks are welcome and always allowed.
