#!/usr/bin/env node
// Pre-commit guard: blocks secrets, personal data and private files from being committed.
// Default: scans the staged version of every staged file.
// Test mode: node .githooks/scan.mjs --files <path> [<path> ...]  (reads files from disk)
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const BLOCKED_PATHS = [
  [/(^|\/)\.env(\..+)?$/, "environment file"],
  [/(^|\/)\.mcp\.json$/, "MCP config (may contain auth headers)"],
  [/(^|\/)settings\.local\.json$/, "local settings"],
  [/\.(pem|key|p12|pfx)$/i, "key or certificate file"],
  [/\.(sqlite|sqlite3|db)$/i, "database file"],
  [/(^|\/)(vault-data|private)\//, "private data folder"],
];
const ALLOWED_PATHS = [/(^|\/)\.env\.example$/];

const PATTERNS = [
  [/gh[pousr]_[A-Za-z0-9]{36,}/, "GitHub token"],
  [/github_pat_[A-Za-z0-9_]{20,}/, "GitHub fine-grained token"],
  [/\bsk-[A-Za-z0-9_-]{20,}/, "API key (sk-...)"],
  [/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/, "Telegram bot token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/Bearer\s+[A-Za-z0-9._~+\/-]{20,}/i, "bearer token"],
  [/(api[_-]?key|secret|token|password|passwd)["']?\s*[:=]\s*["']?[A-Za-z0-9_\-\/+=]{16,}/i, "credential assignment"],
  [/https?:\/\/hook\.[a-z0-9.-]*make\.com\/[A-Za-z0-9]{10,}/i, "Make webhook URL"],
  [/https?:\/\/[^\s"'<>]+\/webhook(-test)?\/[0-9a-f-]{16,}/i, "n8n webhook URL"],
  [/[A-Za-z]:\\Users\\[^\\\s"']+/, "Windows user path"],
  [/(^|[\s"'(=])\/(Users|home)\/[A-Za-z0-9._-]+/, "home directory path"],
];
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g;
const ALLOWED_EMAIL_DOMAINS = [/users\.noreply\.github\.com$/i, /(^|\.)example\.(com|org|net)$/i];

const SKIP_CONTENT = new Set(["scan.mjs", "private-terms.example", "package-lock.json"]);

function privateTerms() {
  const file = join(here, "private-terms.txt");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => ({
      // whole-word, case-insensitive: "bob" blocks "bob" but not "bobcat" or "robert"
      re: new RegExp(`(?<![A-Za-z0-9])${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`, "i"),
    }));
}

function git(args, opts = {}) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
}

const redact = (s) => (s.length <= 6 ? "***" : s.slice(0, 4) + "***" + `(${s.length} chars)`);

function scanText(path, text, terms, findings) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const at = `${path}:${i + 1}`;
    for (const [re, label] of PATTERNS) {
      const m = line.match(re);
      if (m) findings.push(`${at}  ${label}: ${redact(m[0].trim())}`);
    }
    for (const m of line.matchAll(EMAIL)) {
      const domain = m[0].split("@")[1];
      if (!ALLOWED_EMAIL_DOMAINS.some((r) => r.test(domain))) findings.push(`${at}  email address: ${redact(m[0])}`);
    }
    for (const t of terms) if (t.re.test(line)) findings.push(`${at}  private term from private-terms.txt`);
  });
}

function main() {
  const args = process.argv.slice(2);
  const testMode = args[0] === "--files";
  const terms = privateTerms();
  const findings = [];
  let files;
  let read;

  if (testMode) {
    files = args.slice(1);
    read = (p) => readFileSync(p);
  } else {
    files = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]).split("\0").filter(Boolean);
    read = (p) => execFileSync("git", ["show", `:${p}`], { maxBuffer: 64 * 1024 * 1024 });
  }

  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    if (!ALLOWED_PATHS.some((r) => r.test(norm))) {
      for (const [re, label] of BLOCKED_PATHS) if (re.test(norm)) findings.push(`${norm}  blocked file: ${label}`);
    }
    if (SKIP_CONTENT.has(basename(norm))) continue;
    let buf;
    try {
      buf = read(f);
    } catch {
      continue;
    }
    if (buf.includes(0)) continue; // binary
    scanText(norm, buf.toString("utf8"), terms, findings);
  }

  if (findings.length) {
    console.error("\nCommit blocked: possible secrets or personal data.\n");
    for (const f of findings.slice(0, 50)) console.error("  " + f);
    if (findings.length > 50) console.error(`  ... and ${findings.length - 50} more`);
    console.error(
      "\nRemove or replace these values (use placeholders or an .env file that is git-ignored), then stage again.\n" +
        "If a finding is a false positive, adjust the pattern in .githooks/scan.mjs and commit that change on its own.\n"
    );
    process.exit(1);
  }
}

main();
