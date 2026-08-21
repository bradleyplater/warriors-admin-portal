#!/usr/bin/env node
// Loads exactly one env file into process.env (no cascading, no fallthrough
// to .env.local — unlike Next's own multi-file loading) then runs the given
// command with it. NODE_OPTIONS can't carry --env-file (Node disallows it
// there), so this does the same job via process.loadEnvFile() instead.
import { spawn } from "node:child_process";

const [envFile, ...command] = process.argv.slice(2);
if (!envFile || command.length === 0) {
  console.error("Usage: node scripts/with-env.mjs <env-file> <command> [args...]");
  process.exit(1);
}

process.loadEnvFile(envFile);
console.log(
  `[with-env] loaded ${envFile} — S3_BUCKET=${process.env.S3_BUCKET} S3_ENDPOINT=${process.env.S3_ENDPOINT || "(unset)"} MONGODB_URI=${process.env.MONGODB_URI}`,
);

// A single joined string (not a file+args array) is required with
// shell: true — passing an args array here has Node re-concatenate them
// unescaped before handing off to the shell (Node's DEP0190).
const child = spawn(command.join(" "), {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
