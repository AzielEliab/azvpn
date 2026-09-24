import {
  AUTHOR,
  GITHUB,
  IDENTITY,
  NAME,
  PRODUCT,
  SPEC_CONCENTRATOR,
  SPEC_ONION,
  VERSION,
} from "./types.js";
import { LIMITATION, LIVE_OPS, MOTTO, STUB_OPS } from "./honesty.js";

export function skillMarkdown(): string {
  return `---
name: ${NAME}
description: >-
  Standalone HTTP/WS lab concentrator with optional Node TLS terminate
  and in-process onion circuits. HTTPS REAL only when TLS terminates.
  Author ${AUTHOR}.
---

# ${NAME}

${MOTTO}

Author: **${AUTHOR}**. Identity is ${IDENTITY} only.
Version: ${VERSION}
Specs: ${SPEC_CONCENTRATOR} + ${SPEC_ONION}
GitHub: ${GITHUB}

**Banner / limitation:** ${LIMITATION}

Always send \`User-Agent: Mozilla/5.0\`.

## Live ops

${LIVE_OPS.map((op) => `- \`${op}\``).join("\n")}

## SLOT ops (refuse)

${STUB_OPS.map((op) => `- \`${op}\``).join("\n")}

## Local invoke

\`\`\`bash
npm install
npx tsx src/cli.ts ui
npx tsx src/cli.ts health
npx tsx src/cli.ts open --peer alice --mode onion
npx tsx src/cli.ts cert --dir ./lab-tls
npx tsx src/cli.ts ui --tls --tls-cert ./lab-tls/cert.pem --tls-key ./lab-tls/key.pem
\`\`\`

Open http://127.0.0.1:8787/ after \`ui\`. The path comes up with \`ui\`. Rotate with \`azvpn rotate\`.
Default bind is loopback HTTP. \`--json\` keeps the machine result. \`--tls\` without cert/key fail-closes. ACME is SLOT.

FragGate catalog slug remains \`${PRODUCT}\` on aziel-runtime. This repo is the standalone public product.

Lumen stays private. Do not dump private Lumen canon here.
`;
}
