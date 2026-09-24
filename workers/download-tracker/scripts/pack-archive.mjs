import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const out = resolve(root, "workers/download-tracker/public/azvpn-0.1.0.tar.gz");

execFileSync(
  "tar",
  [
    "-czf",
    out,
    "--exclude=.git",
    "--exclude=node_modules",
    "--exclude=dist",
    "--exclude=.wrangler",
    "--exclude=lab-tls",
    "--exclude=.azvpn-state.json",
    "--exclude=azvpn-0.1.0.tar.gz",
    "--transform",
    "s,^\\./,azvpn-0.1.0/,",
    "-C",
    root,
    ".",
  ],
  { stdio: "inherit" },
);

console.log(out);
