# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project

Second Brain + Kanban: a local-first Kanban board whose cards are plain Markdown files. It is meant to sit next to a
Markdown "second brain" vault (compatible with Obsidian) and to be operated by AI agents.
It started from the Week 1 Kanban project of the course "AI Coder: From Vibe Coder to Agentic Engineer" and extends it
with Markdown storage. It is a portfolio project: keep the repository clean, honest and public-safe.

## Repository layout

```
frontend/        Next.js app (the board)
sample-vault/    example vault with fake data, safe to publish
vault-data/      the owner's real vault: PRIVATE, git-ignored, never committed
docs/PLAN.md     phased plan with success criteria (source of truth for progress)
.githooks/       pre-commit scanner for secrets and personal data
AGENTS.md  CLAUDE.md  README.md
```

The owner's real vault lives in `vault-data/` inside the project folder. That folder is git-ignored and blocked by the
pre-commit scanner, so it is never part of the repository. The app finds the vault through the `VAULT_PATH` environment
variable (set in an ignored `.env.local`) and falls back to `sample-vault/`. Open `vault-data/` (not the whole project
folder) as the Obsidian vault.

## Business requirements

MVP (phase 2, from the course starter):
- One board with five columns. Column titles can be renamed. The column set is fixed.
- A card has a title and details.
- Drag and drop moves cards between columns; cards can be added and deleted.
- The app opens with dummy data for the single board.
- Priority: a slick, professional UI/UX with very simple features. No archive, no search or filter. Keep it simple.

Extension (phase 3): the board is stored as Markdown.
- `Kanban.md` holds the board: one `##` heading per column, one checklist item per card, each linking to a task file.
- `Tasks/<id>-<slug>.md` holds the card details. The card title in the board links to its task file.
- The `Kanban.md` format stays compatible with the Obsidian Kanban plugin (front matter `kanban-plugin: board`).
- Status of a card is its column. Task files do not repeat it.

## Technical decisions

- Next.js, client-rendered UI in `frontend/`. Server-side file access only through route handlers, and only for `VAULT_PATH`.
- Use popular libraries and current idiomatic patterns. Keep the design simple. Do not add features that were not asked for.
- Write files atomically and re-read before writing, because Obsidian or an agent may edit the same file.
- Tests: unit tests for logic and components, Playwright for end-to-end flows.
- Node 22 or newer.

## Colors

Accent yellow `#ecad0a` for accent lines and highlights. Blue primary `#209dd7` for links and key sections.
Purple secondary `#753991` for submit buttons and important actions. Dark navy `#032147` for main headings.
Gray `#888888` for supporting text and labels.

## How to work

1. For each phase, check `docs/PLAN.md`, state the success criteria, then implement.
2. Test before reporting: run unit tests, end-to-end tests and the build. Report what was and was not verified.
3. Keep code concise, no over-engineering, no unnecessary defensive code. The README says what the project is, why it
   exists and what works, nothing more. Claim only what was verified. No emojis.
4. Update the phase status in `docs/PLAN.md` when criteria are met.

## Safety rules (must follow)

- Never put secrets, tokens, webhook URLs, personal data, client names, email addresses or local absolute paths into tracked files.
- Never commit anything from `vault-data/`. Never force-add ignored files (`git add -f`). Real data is never copied into
  `sample-vault/`; invent fake data.
- Keep the pre-commit scanner enabled (`core.hooksPath` is `.githooks`). Never bypass hooks (`--no-verify`).
- Do not commit, push or publish unless the owner asks. Every tracked file is reviewed before the repository is made public.
- Do not edit the owner's portfolio or any external page. Write suggestions in the chat instead.
- Language: code, comments and repository docs are in English. Talk to the owner in Ukrainian.
