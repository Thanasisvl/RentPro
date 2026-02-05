/* eslint-disable no-console */
const { spawn } = require("child_process");

// Force Playwright browsers to a stable, project-local path.
// This avoids environment/sandbox cache differences.
process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

const bin = process.platform === "win32" ? "playwright.cmd" : "playwright";
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/pw.js <playwright args...> (e.g. "test")');
  process.exit(2);
}

const child = spawn(bin, args, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});

