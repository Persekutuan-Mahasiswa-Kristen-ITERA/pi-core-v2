#!/usr/bin/env node
/**
 * Runs a command with variables from an env file, e.g.
 *   node scripts/with-env.mjs .env.hosted.local next dev
 *
 * Why not `node --env-file=… next dev`: Next.js forwards the parent's Node flags to its child process through
 * NODE_OPTIONS, and Node rejects --env-file there ("--env-file= is not allowed in NODE_OPTIONS").
 * Variables loaded here win over .env.local, because Next.js never overrides variables already in process.env.
 */
import { spawn } from "node:child_process";

const [file, command, ...rest] = process.argv.slice(2);
// `pnpm dev:hosted -- -p 3001` passes the "--" through; drop it.
const args = rest.filter((arg) => arg !== "--");
if (!file || !command) {
  console.error("Usage: node scripts/with-env.mjs <env-file> <command> [...args]");
  process.exit(2);
}
try {
  process.loadEnvFile(file);
} catch (error) {
  console.error(`Cannot read ${file}: ${error.message}`);
  process.exit(2);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let host = "(unset)";
try {
  host = new URL(url).host;
} catch {}
console.log(`\n  Supabase: ${host}${/127\.0\.0\.1|localhost/.test(host) ? "" : "  ← HOSTED project, real data"}\n`);

const child = spawn(command, args, { stdio: "inherit", env: process.env, shell: process.platform === "win32" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
