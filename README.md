# Second Brain + Kanban

A local-first Kanban board whose cards are plain Markdown files. It sits next to a Markdown "second brain" vault
(works with Obsidian) so people and AI agents read and edit the same files.

Status: in development, see [docs/PLAN.md](docs/PLAN.md).

## Idea

- The board is one Markdown file, `Kanban.md`. Each card links to a task file in `Tasks/`.
- A card's status is its column. The details live in the task file, so an agent gets full context from one file.
- No database and no cloud service. Files on disk are the integration layer.
- Personal data lives in a git-ignored `vault-data/` folder and is never committed. The app reads a vault from
  `VAULT_PATH` and falls back to `sample-vault/`.

## Origin

Built from the Week 1 Kanban project of the course "AI Coder: From Vibe Coder to Agentic Engineer" by Ed Donner,
extended with Markdown storage and a second-brain layer. Built together with Claude Code.

## Repository

```
frontend/       Next.js board
sample-vault/   example vault with fake data
vault-data/     private vault, git-ignored (not part of the repository)
docs/PLAN.md    phases and success criteria
.githooks/      pre-commit scan for secrets and personal data
```
