# The second-brain layer

The board holds the work. The wiki holds what is known. Both live in the same vault of plain Markdown files, so a person,
Obsidian and an AI agent read and write the same things. The wiki follows the LLM Wiki pattern: an agent compiles sources
into linked pages once and keeps them current, instead of re-reading raw documents for every question.

```
vault/
  raw/            sources exactly as received (read-only)
  wiki/           pages written by the agent: sources, entities, concepts, synthesis, index.md, log.md
  hotcache.md     the last five sessions: what was done, what is next
  Kanban.md       the board            Tasks/   one file per card
  AGENTS.md       the rules (the schema)           .claude/   hooks, lint tool, routine prompts
```

The schema is [sample-vault/AGENTS.md](../sample-vault/AGENTS.md). It is the one file the owner reads and edits fully.

## Operations

| Operation | What happens |
|---|---|
| Ingest | A file in `raw/` becomes a source page, updates entity and concept pages, and is added to the index and the log |
| Query | The agent answers from the wiki with links; a good answer is saved as a synthesis page |
| Lint | A script checks what a program can check; the agent checks contradictions and stale claims and writes a report |

Rules that keep it honest: `raw/` is never edited; what a source says (`sources/`) is kept apart from conclusions (`synthesis/`);
a contradiction is marked with a warning sign and logged, never fixed silently; secrets are never copied into the wiki.

## Hooks (Python, in `.claude/hooks/`)

- **SessionStart** puts `hotcache.md`, the latest log entries and the open cards of the board into the agent's context and asks it
  to record the previous session first.
- **Stop** refuses to let the session end while a wiki page is newer than `index.md` or `log.md`. It lets go when it has
  already refused once (`stop_hook_active`), so it cannot loop.

## Lint (`.claude/tools/lint.py`)

Front matter, broken links, duplicate names, pages missing from the index, orphan pages, raw files never ingested, conflict marks
without a log entry, log format and order, hotcache length, secrets. Exit code 1 on errors. `--json` for machines.

## Routines

Prompts for three scheduled tasks are in `.claude/routines/`: Inbox (daily ingest of new files), Lint (weekly) and Reading
(weekly, from a feed). They are text only; scheduling them is the owner's choice.

## How it meets the board

- An agent adds work by writing a line under a column in `Kanban.md`; the board gives it a task file.
- Task files and wiki pages can link to each other by name.
- At the start of a session the agent sees the open cards, so it knows what is being worked on.

## Set up your own vault

```
node scripts/init-vault.mjs vault-data
```

It copies the schema, hooks, lint tool and routine prompts from `sample-vault/`, creates the empty wiki folders, a fresh index,
log and hotcache, and an empty board. It never overwrites an existing file. Open a Claude Code session in the vault folder so
the hooks apply, and open the same folder in Obsidian.

`sample-vault/` shows the result: two invented sources, ingested, with one marked contradiction, one saved answer and one lint report.
