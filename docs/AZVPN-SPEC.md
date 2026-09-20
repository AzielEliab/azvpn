# AZVPN specification

**Product:** AZVPN  
**Author / identity:** Aziel Eliab only  
**License:** Apache-2.0  
**Repo:** https://github.com/AzielEliab/azvpn  
**Specs:** AZVPN-CONCENTRATOR-1.0 + AZVPN-ONION-1.0  
**Version:** 0.1.0

Standalone public Softwares product. Sister private Lumen may adapter-pair later. This tree holds no Lumen canon or secrets.

## What this is

An application-layer **HTTP/WS lab concentrator** (Node `http` + `ws` by default) with **optional Node TLS terminate** plus an **in-process onion router**.

- `open` / `send` / `recv` / `close` allocate session-scoped encrypted envelopes and a peer table.
- Optional `attach` mints a WebSocket ticket for the same inbox (not a second door).
- Onion mode builds a layered circuit: **entry → middle → exit**.
- Rendezvous mode builds **entry → middle → rendezvous** and joins two circuits by cookie.
- `--tls` plus PEM cert/key terminate HTTPS/WSS in this process. Missing material **fail-closes**. ACME is SLOT.

## Honesty (binding)

| Kind | Label |
|------|--------|
| http_ws (default `listen()`) | **REAL** |
| https_ws / https_tls (this process) | **REAL** only when this process terminates TLS; otherwise **SLOT** |
| acme | **SLOT** |
| fraggate_envelopes | **REAL** |
| websocket_attach | **REAL** |
| onion_circuit_layering | **REAL** |
| hybrid_pqc_handshake | **REAL** |
| onion_cell_padding | **REAL** (size buckets, not origin-hiding) |
| rendezvous_join | **REAL** |
| wireguard / openvpn / L3 / TUN / TAP / kernel UDP | **SLOT** |
| socks | **SLOT** |
| public Tor directory / consensus / exit | **SLOT** |
| origin_hiding | **SLOT** |

`tor` as a public-network op **refuses**. `open --mode onion` is the REAL circuit path. `open --mode https_ws` is accepted as an alias and opens a direct envelope session; it does not start TLS by itself. TLS is a listen() property (`--tls` + cert/key).

No claim of “untraceable proven.” Layered peel and cell padding are not origin-hiding.

## Bind

Default listen host is `127.0.0.1`. Non-loopback requires `--expose-non-loopback` **and** a bearer token ≥16 characters (`--token` / `AZVPN_TOKEN`), or the process **refuses** (`AZVPN-BIND-REFUSED` / `AZVPN-AUTH-REQUIRED`). Unauthenticated exposure is refused.

## TLS terminate

When `--tls` or `AZVPN_TLS=1` is set, `--tls-cert` / `AZVPN_TLS_CERT` and `--tls-key` / `AZVPN_TLS_KEY` are **required**. The process refuses (`AZVPN-TLS-REQUIRED`) if they are missing, unreadable, or not PEM. Default loopback HTTP remains the lab path.

Lab cert:

```bash
npx tsx src/cli.ts cert --dir ./lab-tls
# or
openssl req -x509 -newkey rsa:2048 -keyout lab-tls/key.pem -out lab-tls/cert.pem \
  -days 30 -nodes -subj "/CN=127.0.0.1/O=AZVPN Lab"
```

HTTPS is labeled **REAL** only for that listen(). Node TLS is classical — see HN-DR residual. ACME is SLOT.

## Handshake (designed hybrid PQC)

Each hop (and each concentrator session) runs:

1. X25519 ephemeral ECDH  
2. ML-KEM-768 encapsulation  
3. `HKDF-SHA256(salt=AZVPN-HYBRID-PQC-1.0, ikm=X25519_ss || MLKEM_ss, info=azvpn-hop-key, L=32)`

**Fail closed:** X25519-only, missing/wrong-size ML-KEM public key or ciphertext, or incomplete IKM is refused (`AZVPN-NOT-QUANTUM-PROOF`). Every hop key requires the hybrid ML-KEM path. **No silent downgrade.**

After derive, ephemeral X25519 secret, both shared secrets, and the HKDF IKM buffer are `fill(0)` wiped. The 32-byte hop key is kept until `close`.

### NOT_QUANTUM_PROOF residuals (kept)

- X25519 alone is Shor-broken; it is never the sole secret.
- Host metadata remains: IP, SNI (when TLS), hop roster, coarse cell-size buckets, timing.
- XChaCha20-Poly1305 is Grover-reduced AEAD, not a QKD proof. Random 24-byte nonces are used because RFC-8439 12-byte nonces are collision-unsafe.
- **HN-DR:** Node TLS 1.2/1.3 is classical. An adversary who records TLS transcripts may decrypt later if the TLS handshake key is broken. Onion hop keys are hybrid; TLS records are not.
- Key wipe is best-effort. V8 GC copies, JIT, swap, and core dumps remain a side-channel residual.

No mix-net delay is added. **No latency theater** — the UI/CLI do not invent ping or jitter.

## Onion cell

Innermost payload is a **fixed-size cell**: 2-byte big-endian length + plaintext + zero pad to `ONION_CELL_SIZE` (512) or the next 512-byte multiple. Direct envelopes use the same pad.

Each hop wraps `{ next, inner }` with XChaCha20-Poly1305 (AAD `AZVPN-ONION-1.0`). Transit peels **entry → middle → exit|rendezvous**. A hop sees only `next` after its peel.

Padding reduces payload-length leakage to coarse buckets. It does **not** hide origin, IP, SNI, hop roster, or timing. Public Tor stays SLOT.

Relays in this tree are **in-process identities** (`*.azvpn.local`). That is REAL cryptography and REAL circuit state. It is not a public Tor overlay.

Rendezvous delivery: the sender circuit peels to the rendezvous hop; the peer inbox receives the delivered plaintext. Peer hop keys are not claimed to be identical.

## Live ops

`health` `skill` `doctor` `limitation` `describe` `open` `status` `list` `close` `send` `recv` `pull` `peers` `attach` `circuit`

CLI also has `cert` (lab PEM) and `serve --tls` (listen).

`health` / `doctor` / `limitation` / `skill` never open a tunnel.

## SLOT ops (refuse)

`wireguard` `wg` `openvpn` `ovpn` `l3_exit` `exit_pool` `udp_listen` `kernel_vpn` `tun` `tap` `socks` `tor` `origin_hiding`

ACME is SLOT (no op; `--tls` without cert/key refuses).

## Neighbors

Separate software: AZNet, AZBrowser, FragGate. Same catalog door on aziel-runtime (`slug=azvpn`) may adapter-pair. This repo does not invent a product Worker hostname.

## Cite

Eliab, Aziel. (2026). AZVPN 0.1.0 [Software]. Apache-2.0. https://github.com/AzielEliab/azvpn  
No Zenodo DOI is invented here.
