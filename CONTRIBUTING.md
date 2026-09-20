# Contributing to AZVPN

Author identity is **Aziel Eliab** only.

Forks are welcome and always allowed (Apache-2.0).

## Rules

- Keep REAL vs SLOT labels honest. Do not mark WireGuard, public Tor, origin-hiding, or ACME as REAL.
- HTTPS/TLS is REAL only when this process actually terminates TLS (`--tls` + cert/key). Default listen stays HTTP/WS lab (SLOT for HTTPS).
- Do not claim HTTPS on the plain HTTP/WS lab server.
- Default bind is loopback. Non-loopback requires explicit opt-in plus a bearer token.
- Do not add latency theater (fake ping, fake jitter).
- Do not claim “untraceable proven.”
- Keep `NOT_QUANTUM_PROOF` residuals labeled: host metadata, Grover AEAD, HN-DR (classical Node TLS), wipe side-channel.
- Classical-only / X25519-only handshakes must fail closed. No silent downgrade.
- Do not clone, copy, or dump private Lumen canon or secrets into this repository.
- Do not invent a Zenodo DOI or a product Worker hostname.

## Tests

```bash
npm install
npm test
```

Open a PR against `main`.
