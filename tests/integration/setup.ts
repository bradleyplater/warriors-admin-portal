import { existsSync } from "node:fs";

// Node's native .env loader (stable since Node 22) — mirrors the values a
// developer would have in .env.local without depending on Next.js internals.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}
