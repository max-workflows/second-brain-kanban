#!/usr/bin/env node
// Sets up a new vault: the schema, hooks, lint tool and routine prompts from sample-vault/,
// empty wiki folders with a fresh index, log and hotcache, and an empty board.
// It never overwrites a file that already exists, so running it again is safe.
//
// Usage: node scripts/init-vault.mjs [target-folder]    (default: vault-data)
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const template = path.join(repo, "sample-vault");
const target = path.resolve(process.argv[2] ?? path.join(repo, "vault-data"));

const created = [];
const skipped = [];

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    created.push(path.relative(target, dir).replaceAll("\\", "/") + "/");
  }
}

function writeIfMissing(file, content) {
  const rel = path.relative(target, file).replaceAll("\\", "/");
  if (existsSync(file)) return skipped.push(rel);
  ensureDir(path.dirname(file));
  writeFileSync(file, content, "utf8");
  created.push(rel);
}

function copyTree(from, to) {
  for (const name of readdirSync(from)) {
    if (name === "__pycache__") continue;
    const source = path.join(from, name);
    const dest = path.join(to, name);
    if (statSync(source).isDirectory()) {
      copyTree(source, dest);
    } else if (existsSync(dest)) {
      skipped.push(path.relative(target, dest).replaceAll("\\", "/"));
    } else {
      ensureDir(path.dirname(dest));
      copyFileSync(source, dest);
      created.push(path.relative(target, dest).replaceAll("\\", "/"));
    }
  }
}

const date = (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

// The board: the same text the app writes for a new, empty board.
const columns = ["Backlog", "Next", "In progress", "Review", "Done"];
const board = [
  "---", "", "kanban-plugin: board", "", "---", "",
  ...columns.flatMap((title) => [`## ${title}`, "", "", ""]),
  "%% kanban:settings", "```", '{"kanban-plugin":"board"}', "```", "%%",
].join("\n") + "\n";

mkdirSync(target, { recursive: true });

for (const file of ["AGENTS.md", "CLAUDE.md"]) {
  const dest = path.join(target, file);
  if (existsSync(dest)) skipped.push(file);
  else {
    copyFileSync(path.join(template, file), dest);
    created.push(file);
  }
}
copyTree(path.join(template, ".claude"), path.join(target, ".claude"));

for (const dir of ["raw/articles", "raw/other", "wiki/sources", "wiki/entities", "wiki/concepts", "wiki/synthesis", "Tasks"]) {
  ensureDir(path.join(target, dir));
}

writeIfMissing(
  path.join(target, "wiki", "index.md"),
  "# Index\n\nCatalog of every wiki page, one line each. Updated on every ingest.\n\n## Sources\n\n## Entities\n\n## Concepts\n\n## Synthesis\n",
);
writeIfMissing(
  path.join(target, "wiki", "log.md"),
  `# Log\n\n## [${date}] schema | Vault created\n- Structure from AGENTS.md: raw/, wiki/ (sources, entities, concepts, synthesis), index, log, hotcache.\n`,
);
writeIfMissing(
  path.join(target, "hotcache.md"),
  `# Hotcache\n\nThe last five sessions, newest first. Read this first when a session starts.\n\n## ${date}: Vault created\n- Done: set up the structure.\n- Next: put the first source in raw/ and run an ingest.\n`,
);
writeIfMissing(path.join(target, "Kanban.md"), board);

console.log(`Vault: ${target}`);
console.log(`Created ${created.length} item(s), left ${skipped.length} existing item(s) untouched.`);
for (const item of created) console.log(`  + ${item}`);
for (const item of skipped) console.log(`  = ${item} (already there)`);
