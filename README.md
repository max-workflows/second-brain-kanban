# Second Brain + Kanban

A local-first Kanban board whose cards are plain Markdown files. It sits next to a Markdown "second brain" vault
(works with Obsidian) so people and AI agents read and edit the same files.

Status: in development, see [docs/PLAN.md](docs/PLAN.md).

## Idea

- The board is one Markdown file, `Kanban.md`. Each card links to a task file in `Tasks/`.
- A card's status is its column. The details live in the task file, so an agent gets full context from one file.
- No database and no cloud service. Files on disk are the integration layer.
- Edits made elsewhere (Obsidian, an editor, an agent) show up on the board within two seconds.
- Personal data lives in a git-ignored `vault-data/` folder and is never committed.

The file format is described in [docs/VAULT-FORMAT.md](docs/VAULT-FORMAT.md).

## Run

```
cd frontend
npm install
npm run dev        # http://localhost:3000, for development
```

On Windows, `start.cmd` builds the app when needed, starts it and opens the browser (close its window to stop).

Without any setup the app works on a throw-away copy of `sample-vault/` (kept in `.demo-vault/`, git-ignored).
To use your own vault, create `frontend/.env.local` (git-ignored):

```
VAULT_PATH=../vault-data
```

The server listens on `127.0.0.1` only and refuses requests that do not come from the local machine.

## Themes and keyboard

The board follows the system light or dark theme. The button in the top right (or the `T` key) switches between
system, light and dark, and remembers the choice.

| Key | Action |
|---|---|
| `N` | New card in the first column |
| `1` – `9` | New card in that column |
| `E` | Edit the card that has focus |
| `Space`, arrows, `Space` | Move the card that has focus |
| `T` | Change theme |
| `?` | Show the shortcuts |
| `Esc` | Close a window or a form |

Shortcuts use the physical key, so they work on any keyboard layout (for example Ukrainian).

## Tests

```
npm run test        # unit and component tests (Vitest)
npm run test:e2e    # browser tests (Playwright), on a copy of sample-vault
npm run lint
```

## Origin

Built from the Week 1 Kanban project of the course "AI Coder: From Vibe Coder to Agentic Engineer" by Ed Donner,
extended with Markdown storage and a second-brain layer. Built together with Claude Code.

## Repository

```
frontend/       Next.js board and the vault API
sample-vault/   example vault with fake data
vault-data/     private vault, git-ignored (not part of the repository)
docs/           plan and file format
.githooks/      pre-commit scan for secrets and personal data
start.cmd       one-click start on Windows
```
