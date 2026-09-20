---
name: AZVPN
description: >-
  Standalone HTTPS/WebSocket concentrator with in-process onion circuits.
  Author Aziel Eliab.
---

# AZVPN

App-layer envelopes and onion peel are REAL. Kernel VPN and public Tor stay SLOT.

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

## Catalog (neighbor, not this repo)

- Pull: `https://aziel-runtime.vibelock.workers.dev/v1/pull/azvpn`
- Invoke prefix: `https://aziel-runtime.vibelock.workers.dev/p/azvpn`
- FragGate: `{ "slug": "azvpn", "op": "health" }`

## Live ops

health, skill, doctor, limitation, describe, open, status, list, close, send, recv, pull, peers, attach, circuit

## SLOT (refuse)

wireguard, openvpn, l3_exit, tun, tap, socks, tor, origin_hiding

Lumen stays private. This skill is public AZVPN only.
