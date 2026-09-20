---
name: AZVPN
description: >-
  Standalone HTTP/WS lab concentrator with in-process onion circuits. Not TLS.
  Author Aziel Eliab.
---

# AZVPN

HTTP/WS lab + onion peel are REAL. HTTPS/TLS, kernel VPN, and public Tor stay SLOT.

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
Version: 0.1.0
GitHub: https://github.com/AzielEliab/azvpn

Always send `User-Agent: Mozilla/5.0`.

## Local

```bash
npx tsx src/cli.ts health
npx tsx src/cli.ts open --peer alice --mode onion
npx tsx src/cli.ts serve
```

`serve` binds 127.0.0.1. Non-loopback needs `--expose-non-loopback` and `--token`.

## Catalog (neighbor, not this repo)

- Pull: `https://aziel-runtime.vibelock.workers.dev/v1/pull/azvpn`
- Invoke prefix: `https://aziel-runtime.vibelock.workers.dev/p/azvpn`
- FragGate: `{ "slug": "azvpn", "op": "health" }`

Catalog kind `https_ws` is the Worker name. This process is HTTP/WS lab.

## Live ops

health, skill, doctor, limitation, describe, open, status, list, close, send, recv, pull, peers, attach, circuit

## SLOT (refuse)

https_tls, wireguard, openvpn, l3_exit, tun, tap, socks, tor, origin_hiding

Lumen stays private. This skill is public AZVPN only.
