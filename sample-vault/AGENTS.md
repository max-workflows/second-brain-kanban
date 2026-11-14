# AGENTS.md: how this vault works

You maintain a personal knowledge base (a "second brain") in plain Markdown, following the LLM Wiki pattern.
The owner collects sources and asks questions; you write and keep the wiki. Knowledge is compiled once and then
kept current, instead of being worked out again from raw documents for every question.

Language: write pages in English. Quote sources in their own language.

## Layout

```
raw/              sources exactly as received (articles, notes, documents). The owner or routines put files here.
wiki/
  index.md        catalog of every page, one line each
  log.md          journal of operations, newest first
  sources/        what a source says
  entities/       people, organizations, products, projects, places
  concepts/       ideas, terms, methods
  synthesis/      the owner's conclusions, comparisons, saved answers, reports
hotcache.md       the last five sessions: what was done, what is next
Kanban.md         the work board (see Tasks below)
Tasks/            one file per board card
.claude/          hooks, tools and routine prompts
```

## Rules

1. `raw/` is read-only. Never edit, rename or delete what was put there.
2. What a source says goes in `sources/` (and, with a link back, in `entities/` and `concepts/`).
   Conclusions, opinions and comparisons go only in `synthesis/`. Never mix the two.
3. Every claim links to where it comes from: `[[source-page]]` or a path in `raw/`.
4. Do not invent. If the sources do not say, write "unknown".
5. A contradiction is never fixed silently. See Contradictions.
6. Never delete a page unless the owner says so.
7. Secrets: never copy tokens, passwords, API keys, webhook URLs or account ids into the wiki.
   Name the variable instead ("the Telegram bot token"). If you see a secret in `raw/`, tell the owner to revoke it.

## Pages

File names are lowercase kebab-case and unique in the whole vault (also against `raw/`), so `[[name]]` links work
without a path. Raw files start with a date (`2026-11-09-local-first-notes.md`); the source page drops the date
(`local-first-notes.md`), so the two never share a name.
Every page starts with front matter:

```yaml
---
type: source | entity | concept | synthesis
title: Human readable title
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: [raw/articles/file.md]
status: draft | stable | conflict
---
```

- `type` matches the folder (`sources/` is `source`, and so on). `sources` lists the raw files the page rests on.
- A source page has: Summary (3-7 sentences), Key claims, Quotes (few, with place), Mentions (links), Metadata (author, date, URL).
- An entity or concept page has: Definition (1-2 sentences), What the sources say (claims with links), Related.
- A synthesis page has: Question, Conclusion, Reasoning (links), Uncertainties, What to check next.

## Operation: Ingest

Run it when a new file appears in `raw/` or the owner asks. One source at a time.

1. Read the source fully. Say the 3-5 main points to the owner.
2. Create `wiki/sources/<name>.md`.
3. Create or update every entity and concept it mentions (usually 3-10 pages), each linking back to the source page.
4. Check the new claims against existing pages. On a clash, follow Contradictions.
5. Add the new pages to `wiki/index.md` (one line each) and update changed ones.
6. Add an entry at the top of `wiki/log.md`.
7. Update `hotcache.md`.

## Operation: Query

1. Read `wiki/index.md`, then only the pages you need. Go to `raw/` only to check a detail.
2. Answer with links to wiki pages. Keep what the sources say apart from your own conclusion.
3. If the answer is worth keeping (not trivial, likely to be useful again), save it as a page in `synthesis/`,
   add it to the index and note it in the log. Otherwise do not save it.

## Operation: Lint

Run `python .claude/tools/lint.py` first. It checks what a program can check: broken links, pages missing from the
index, orphan pages, front matter, log format, the length of hotcache, secrets, raw files not yet ingested.
Then check what needs judgement: contradictions between pages, claims that newer sources have made stale,
concepts mentioned in three or more places without a page of their own.
Fix mechanical findings (links, index lines, front matter). Only propose the rest.
Save the report as `wiki/synthesis/lint-YYYY-MM-DD.md` and add a `lint` entry to the log. Delete nothing.

## Contradictions

When a new source or conclusion disagrees with an existing page, do not overwrite and do not smooth it over.

1. On both pages write `⚠️ Contradiction: [[page-a]] says X, [[page-b]] says Y.` and keep both claims with their sources.
2. Set `status: conflict` on both pages.
3. Add a `conflict` entry to the log.
4. Do not decide who is right; suggest how to check.
5. Remove the ⚠️ only when the owner decides. Keep the history of the decision in the text and add a `resolved` entry.

## Log format

`wiki/log.md` starts with `# Log`. Each entry is a heading plus a short list, newest first:

```
## [YYYY-MM-DD] operation | title
- what was created or changed
```

Operations: `ingest`, `query`, `lint`, `conflict`, `resolved`, `schema`. Do not edit old entries.
The format is not repeated inside `log.md`, so no line there looks like an entry by accident.

## Hotcache

`hotcache.md` holds exactly five blocks, newest first:

```
## YYYY-MM-DD: topic of the session
- Done: ...
- Next: ...
```

At the end of a session add a block at the top and remove the sixth. It is a quick context, not an archive; the log is the archive.

## Tasks

Work to do lives on the board (`Kanban.md`), not in the wiki.
To add a card, add a line under a column heading, for example `- [ ] Collect ten sources #research`.
The board app gives it a task file in `Tasks/` and links it. Write the details in that file; wiki pages can link to it by name.
Column names are the owner's; do not rename or reorder columns.
