---
name: AZVPN
description: >-
  Standalone HTTP/WS lab concentrator with optional Node TLS terminate
  and in-process onion circuits. HTTPS REAL only when TLS terminates.
  Author Aziel Eliab.
---

# AZVPN

HTTP/WS lab + onion peel are REAL. HTTPS is REAL only when this process
terminates TLS. ACME, kernel VPN, and public Tor stay SLOT.

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
Version: 0.1.0
GitHub: https://github.com/AzielEliab/azvpn

Always send `User-Agent: Mozilla/5.0`.

## Local

```bash
npm install
npx tsx src/cli.ts ui
```

Open http://127.0.0.1:8787/

```bash
npx tsx src/cli.ts health
npx tsx src/cli.ts open --peer alice --mode onion
npx tsx src/cli.ts cert --dir ./lab-tls
npx tsx src/cli.ts ui --tls --tls-cert ./lab-tls/cert.pem --tls-key ./lab-tls/key.pem
```

`ui` binds 127.0.0.1. People get a short welcome and `--help`. Programs add `--json`.
Non-loopback needs `--expose-non-loopback` and `--token` (`azvpn help advanced`).
`--tls` without cert and key fail-closes.

## Catalog (neighbor, not this repo)

- Pull: `https://aziel-runtime.vibelock.workers.dev/v1/pull/azvpn`
- Invoke prefix: `https://aziel-runtime.vibelock.workers.dev/p/azvpn`
- FragGate: `{ "slug": "azvpn", "op": "health" }`

Catalog kind `https_ws` is the Worker name. This process is HTTP/WS lab unless
it terminates TLS.

## Live ops

health, skill, doctor, limitation, describe, open, status, list, close, send, recv, pull, peers, attach, circuit

## SLOT (refuse)

acme, wireguard, openvpn, l3_exit, tun, tap, socks, tor, origin_hiding

Lumen stays private. This skill is public AZVPN only.
