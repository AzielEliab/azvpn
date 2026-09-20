# AZVPN specification

**Product:** AZVPN  
**Author / identity:** Aziel Eliab only  
**License:** Apache-2.0  
**Repo:** https://github.com/AzielEliab/azvpn  
**Specs:** AZVPN-CONCENTRATOR-1.0 + AZVPN-ONION-1.0  
**Version:** 0.1.0

Standalone public Softwares product. Sister private Lumen may adapter-pair later. This tree holds no Lumen canon or secrets.

## What this is

An application-layer **HTTPS/WebSocket concentrator** plus an **in-process onion router**.

- `open` / `send` / `recv` / `close` allocate session-scoped encrypted envelopes and a peer table.
- Optional `attach` mints a WebSocket ticket for the same inbox (not a second door).
- Onion mode builds a layered circuit: **entry → middle → exit**.
- Rendezvous mode builds **entry → middle → rendezvous** and joins two circuits by cookie.

## Honesty (binding)

| Kind | Label |
|------|--------|
| https_ws | **REAL** |
| fraggate_envelopes | **REAL** |
| websocket_attach | **REAL** |
| onion_circuit_layering | **REAL** |
| hybrid_pqc_handshake | **REAL** |
| rendezvous_join | **REAL** |
| wireguard / openvpn / L3 / TUN / TAP / kernel UDP | **SLOT** |
| socks | **SLOT** |
| public Tor directory / consensus / exit | **SLOT** |
| origin_hiding | **SLOT** |

`tor` as a public-network op **refuses**. `open --mode onion` is the REAL circuit path.

No claim of “untraceable proven.” Layered peel is not origin-hiding.

## Handshake (designed hybrid PQC)

Each hop (and each concentrator session) runs:

1. X25519 ephemeral ECDH  
2. ML-KEM-768 encapsulation  
3. `HKDF-SHA256(salt=AZVPN-HYBRID-PQC-1.0, ikm=X25519_ss || MLKEM_ss, info=azvpn-hop-key, L=32)`

X25519-only is refused (`AZVPN-NOT-QUANTUM-PROOF`).

### NOT_QUANTUM_PROOF residuals (kept)

- X25519 alone is Shor-broken; it is never the sole secret.
- HTTPS/TLS and WebSocket inherit the host stack. This repo does not claim PQ-TLS.
- XChaCha20-Poly1305 is Grover-reduced, not a QKD proof. Random 24-byte nonces are used because RFC-8439 12-byte nonces are collision-unsafe.
- Metadata remains: hop roster, sizes, timing.

No mix-net delay is added. **No latency theater** — the UI/CLI do not invent ping or jitter.

## Onion cell

Innermost payload is hex(plaintext). Each hop wraps `{ next, inner }` with XChaCha20-Poly1305 (AAD `AZVPN-ONION-1.0`). Transit peels **entry → middle → exit|rendezvous**. A hop sees only `next` after its peel.

Relays in this tree are **in-process identities** (`*.azvpn.local`). That is REAL cryptography and REAL circuit state. It is not a public Tor overlay.

Rendezvous delivery: the sender circuit peels to the rendezvous hop; the peer inbox receives the delivered plaintext. Peer hop keys are not claimed to be identical.

## Live ops

`health` `skill` `doctor` `limitation` `describe` `open` `status` `list` `close` `send` `recv` `pull` `peers` `attach` `circuit`

`health` / `doctor` / `limitation` / `skill` never open a tunnel.

## SLOT ops (refuse)

`wireguard` `wg` `openvpn` `ovpn` `l3_exit` `exit_pool` `udp_listen` `kernel_vpn` `tun` `tap` `socks` `tor` `origin_hiding`

## Neighbors

Separate software: AZNet, AZBrowser, FragGate. Same catalog door on aziel-runtime (`slug=azvpn`) may adapter-pair. This repo does not invent a product Worker hostname.

## Cite

Eliab, Aziel. (2026). AZVPN 0.1.0 [Software]. Apache-2.0. https://github.com/AzielEliab/azvpn  
No Zenodo DOI is invented here.
