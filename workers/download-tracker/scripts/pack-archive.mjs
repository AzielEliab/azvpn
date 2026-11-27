import { execFileSync } from "node:child_process";
import { readdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const out = resolve(root, "workers/download-tracker/public/azvpn-0.1.0.tar.gz");
const partial = "/tmp/azvpn-0.1.0.tar.gz.partial";

const skip = new Set([
  ".git",
  "node_modules",
  "dist",
  ".wrangler",
  "lab-tls",
  ".azvpn-state.json",
  "coverage",
  ".DS_Store",
]);

const names = readdirSync(root)
  .filter((name) => !skip.has(name) && !name.endsWith(".log"))
  .sort();

rmSync(partial, { force: true });

execFileSync(
  "tar",
  [
    "-czf",
    partial,
    "--exclude=.git",
    "--exclude=node_modules",
    "--exclude=dist",
    "--exclude=.wrangler",
    "--exclude=lab-tls",
    "--exclude=.azvpn-state.json",
    "--exclude=coverage",
    "--exclude=.DS_Store",
    "--exclude=*.log",
    "--exclude=*.partial",
    "--exclude=azvpn-0.1.0.tar.gz",
    "--transform",
    "s,^,azvpn-0.1.0/,",
    "-C",
    root,
    ...names,
  ],
  { stdio: "inherit" },
);

renameSync(partial, out);
console.log(out);
