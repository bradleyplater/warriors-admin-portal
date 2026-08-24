#!/usr/bin/env node
// Loads exactly one env file into process.env (no cascading, no fallthrough
// to .env.local — unlike Next's own multi-file loading) then runs the given
// command with it. NODE_OPTIONS can't carry --env-file (Node disallows it
// there), so this does the same job via process.loadEnvFile() instead.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const [envFile, ...command] = process.argv.slice(2);
if (!envFile || command.length === 0) {
  console.error("Usage: node scripts/with-env.mjs <env-file> <command> [args...]");
  process.exit(1);
}

// A real MONGODB_URI embeds a password in its userinfo (mongodb[+srv]://
// user:pass@host/...) — never print that verbatim, this line's whole job
// is to be safe to paste into a chat transcript or CI log.
function maskMongoUri(uri) {
  if (!uri) {
    return "(unset)";
  }
  try {
    const url = new URL(uri);
    const userinfo = url.username ? `${url.username}:***@` : "";
    return `${url.protocol}//${userinfo}${url.host}${url.pathname}${url.search}`;
  } catch {
    return "(set — unparseable as a URL, value withheld)";
  }
}

// Missing is not fatal here — CI (and anywhere else that injects real env
// vars directly into process.env rather than via a dotenv file, e.g. a
// GitHub Actions workflow's own `env:` block) has no .env.local at all.
// Whatever's already in process.env is used as-is; a genuinely missing
// required var still fails loudly downstream (e.g. getDb()'s own
// "MONGODB_URI is not set").
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
  console.log(
    `[with-env] loaded ${envFile} — S3_BUCKET=${process.env.S3_BUCKET} S3_ENDPOINT=${process.env.S3_ENDPOINT || "(unset)"} MONGODB_URI=${maskMongoUri(process.env.MONGODB_URI)}`,
  );
} else {
  console.log(
    `[with-env] ${envFile} not found, using process.env as-is — S3_BUCKET=${process.env.S3_BUCKET} S3_ENDPOINT=${process.env.S3_ENDPOINT || "(unset)"} MONGODB_URI=${maskMongoUri(process.env.MONGODB_URI)}`,
  );
}

// A single joined string (not a file+args array) is required with
// shell: true — passing an args array here has Node re-concatenate them
// unescaped before handing off to the shell (Node's DEP0190).
const child = spawn(command.join(" "), {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
