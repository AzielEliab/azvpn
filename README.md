# AZVPN

AZVPN comes up on its own. The local page rotates the circuit and holds settings. The path stays on.

**Author:** Aziel Eliab  
**License:** [Apache-2.0](LICENSE)  
**Version:** 0.1.0

## Start

```bash
npm install
npx tsx src/cli.ts ui
```

Open http://127.0.0.1:8787/

Add `--json` to any command when a program needs the machine result.

The page primary action is **Rotate IP**. Settings are under Advanced.

## Everyday commands

```bash
npx tsx src/cli.ts
npx tsx src/cli.ts rotate
npx tsx src/cli.ts health
npx tsx src/cli.ts doctor
npx tsx src/cli.ts --help
```

Lab TLS, certificates, and listening beyond this machine are under `azvpn help advanced`.

State file: `./.azvpn-state.json` (`--state` or `AZVPN_STATE`). Treat it as local secrets.

## Library

```ts
import { createEngine } from "azvpn";

const azvpn = createEngine();
azvpn.dispatch("open", { peer: "alice", mode: "onion" });
```

## Notes

Specs: [docs/AZVPN-SPEC.md](docs/AZVPN-SPEC.md). Forks are welcome and always allowed.

### Labels

| Path | Label |
|------|--------|
| HTTP/WS lab concentrator (default listen) | **REAL** |
| Encrypted envelopes + WebSocket attach | **REAL** |
| Onion circuit layering (in this process) | **REAL** |
| Hybrid handshake (X25519 + ML-KEM-768) | **REAL** |
| Local rendezvous join | **REAL** |
| Fixed-size onion cells | **REAL** |
| HTTPS/TLS on this process | **REAL** only when `--tls` and a cert and key terminate TLS. Otherwise **SLOT** |
| ACME | **SLOT** |
| WireGuard / OpenVPN / L3 / TUN / TAP | **SLOT** |
| Public Tor / SOCKS | **SLOT** |
| Origin hiding | **SLOT** |

The FragGate catalog kind `https_ws` on aziel-runtime is a neighbor Worker. This process claims HTTPS when Node TLS terminates here.

`NOT_QUANTUM_PROOF` residuals stay labeled: host metadata, Grover AEAD, HN-DR on classical Node TLS, and wipe side-channel.

### Listening address

`azvpn ui` binds **127.0.0.1**.

Listening on another address needs both flags:

```bash
npx tsx src/cli.ts ui --host 0.0.0.0 --expose-non-loopback --token "$AZVPN_TOKEN"
```

The token is at least 16 characters (`--token` or `AZVPN_TOKEN`). Off-machine requests send `Authorization: Bearer …` or `x-azvpn-token`. A `?token=` query works and leaks in logs and Referer. Loopback stays the ordinary path.

### Lab TLS

`--tls` refuses to start without a certificate and a key. ACME stays SLOT.

```bash
npx tsx src/cli.ts cert --dir ./lab-tls
npx tsx src/cli.ts ui --tls --tls-cert ./lab-tls/cert.pem --tls-key ./lab-tls/key.pem
```

The same switch is `AZVPN_TLS=1` with `AZVPN_TLS_CERT` and `AZVPN_TLS_KEY`.

`azvpn cert` prefers openssl and falls back to an in-process RSA lab certificate. Node TLS 1.2/1.3 is classical, so Harvest-Now-Decrypt-Later (HN-DR) on recorded TLS transcripts remains a `NOT_QUANTUM_PROOF` residual when HTTPS is REAL for this process.

openssl equivalent:

```bash
openssl req -x509 -newkey rsa:2048 -keyout lab-tls/key.pem -out lab-tls/cert.pem \
  -days 30 -nodes -subj "/CN=127.0.0.1/O=AZVPN Lab"
```

### Catalog neighbor

FragGate slug `azvpn` on [aziel-runtime](https://github.com/AzielEliab/aziel-runtime) remains the in-runtime concentrator cite (`AZVPN-CONCENTRATOR-1.0`). This repository is the standalone public product: https://github.com/AzielEliab/azvpn

Send `User-Agent: Mozilla/5.0` when calling hosted catalog routes.

Lumen canon stays in its private repository. This tree is standalone.

- [AZNet](https://github.com/AzielEliab/aznet) — pairing stays order and token
- [AZBrowser](https://github.com/AzielEliab/azbrowser) — may auto-bind catalog AZVPN
- [FragGate](https://github.com/AzielEliab/fraggate) — one public door for catalog ops
