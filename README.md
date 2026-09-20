# AZVPN

Standalone **HTTP/WS lab concentrator** (plain Node `http` + `ws` by default)
with **optional Node TLS terminate** and **in-process onion routing**
(entry → middle → exit / rendezvous). Hybrid PQC handshake designed as
X25519 + ML-KEM-768. Classical-only handshakes fail closed.

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
| HTTP/WS lab concentrator (default `listen()`) | **REAL** |
| Encrypted envelopes + WS/WSS attach | **REAL** |
| Onion circuit layering (in-process) | **REAL** |
| Hybrid PQC handshake (X25519 + ML-KEM-768) | **REAL** |
| Local rendezvous join | **REAL** |
| Fixed-size onion cells (payload-length buckets) | **REAL** |
| HTTPS/TLS termination (this process) | **REAL** only when `--tls` + cert/key actually terminate; otherwise **SLOT** |
| Catalog kind name `https_ws` (implies TLS) | **REAL** here only when this process terminates TLS; neighbor Worker is separate |
| ACME / Let's Encrypt | **SLOT** |
| WireGuard / OpenVPN / L3 / TUN / TAP | **SLOT** |
| Public Tor directory / exit / SOCKS | **SLOT** |
| Origin-hiding / “untraceable proven” | **SLOT** |

FragGate catalog `https_ws` on aziel-runtime is a **neighbor Worker**, not this
lab server. This tree claims HTTPS **only** when Node TLS actually terminates.

`NOT_QUANTUM_PROOF` residuals stay labeled (host metadata, Grover AEAD, HN-DR,
wipe side-channel). No latency theater.

## Bind (danger)

`azvpn serve` binds **127.0.0.1** only by default.

Non-loopback (`0.0.0.0`, LAN, public) is **refused** unless you pass **both**:

```bash
npx tsx src/cli.ts serve --host 0.0.0.0 --expose-non-loopback --token "$AZVPN_TOKEN"
```

Token must be ≥16 characters (`--token` or `AZVPN_TOKEN`). Off-loopback
requests need `Authorization: Bearer …` or `x-azvpn-token`. `?token=` works
and **leaks** in logs/Referer.

Unauthenticated non-loopback exposure is refused. Prefer loopback.

## TLS terminate

Default remains loopback HTTP lab. `--tls` **fail-closes** without cert and key.

```bash
npx tsx src/cli.ts cert --dir ./lab-tls
npx tsx src/cli.ts serve --tls --tls-cert ./lab-tls/cert.pem --tls-key ./lab-tls/key.pem
```

Equivalent env: `AZVPN_TLS=1`, `AZVPN_TLS_CERT`, `AZVPN_TLS_KEY`.

openssl equivalent (documented lab path):

```bash
openssl req -x509 -newkey rsa:2048 -keyout lab-tls/key.pem -out lab-tls/cert.pem \
  -days 30 -nodes -subj "/CN=127.0.0.1/O=AZVPN Lab"
```

`azvpn cert` prefers openssl and falls back to an in-process RSA lab cert.
**Not ACME.** Lab only. Node TLS 1.2/1.3 is classical (typically X25519/P-256) —
Harvest-Now-Decrypt-Later (**HN-DR**) on recorded TLS transcripts remains a
`NOT_QUANTUM_PROOF` residual even when HTTPS is REAL for this process.

## Quick start

```bash
npm install
npm test
npx tsx src/cli.ts open --peer alice --mode onion
npx tsx src/cli.ts serve
```

Open http://127.0.0.1:8787 (loopback HTTP/WS lab).

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

THIS IS: an application-layer HTTP/WS lab concentrator (optional Node TLS
terminate) plus in-process multi-hop onion circuits with a designed hybrid
PQC handshake.

THIS IS NOT: ACME, a kernel VPN, a public Tor overlay, SOCKS, origin-hiding
fabric, or an untraceable proof. HTTPS is REAL only when this process
terminates TLS.

Cite the GitHub repository. No Zenodo DOI is invented here.

Apache-2.0. Forks are welcome and always allowed.
