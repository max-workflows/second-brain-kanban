# Plan

Status legend: done, in progress, todo.

## Phase 0. Foundation: done
Git repository, `.gitignore`, `.gitattributes`, pre-commit scanner for secrets and personal data.
- Scanner blocks tokens, webhook URLs, emails, user paths, private files and private terms. Tested on fake data.

## Phase 1. Project scaffolding: done
Files: `AGENTS.md`, `CLAUDE.md`, `README.md`, this plan.
Success criteria:
- All four files exist and describe the same project, rules and layout.
- The scanner passes on every tracked file.
- Nothing from the real vault or the owner's machine appears in the repository.
- First commit made only when the owner asks.

## Phase 2. Kanban MVP: done
Next.js app in `frontend/`, five renameable columns, cards with title and details, drag and drop, add and delete, dummy data.
Verified: unit tests, Playwright tests in a real browser (add, edit, delete, rename, drag and drop), production build, no console errors.
Also added: `start.cmd` for one-click start on Windows.
Success criteria:
- `npm run dev` opens a board with five columns and sample cards.
- A column can be renamed; a card can be added, deleted and dragged between columns.
- Unit tests pass. Playwright tests cover add, delete, rename and move. The production build succeeds.
- No errors in the browser console during these flows.

## Phase 3. Markdown storage: done
The board reads and writes `Kanban.md` and `Tasks/*.md` under `VAULT_PATH`. See [VAULT-FORMAT.md](VAULT-FORMAT.md).
Also added: card editor, tags, live refresh from disk, deleted cards archived instead of erased, API limited to the local machine.
Also added: dark theme (system, light or dark, remembered, no flash on load; contrast checked by a test) and keyboard shortcuts
(new card, edit, move, theme, help; they work on any keyboard layout).
Not done on purpose: column card limits, search.
Success criteria:
- Create, rename, move and delete in the UI are reflected in the files. Opening a card shows and edits its task file.
- Round-trip test: parse and write `Kanban.md` without changing it.
- An edit made in Obsidian shows up after reload. Writes are atomic and re-read the file first.
- With `VAULT_PATH` unset the app uses `sample-vault/`.

## Phase 4. Second-brain layer: todo
Vault conventions for the owner's knowledge base: `raw/` sources, `wiki/` pages, index, log, hotcache; ingest, query and lint
operations; session hooks and scheduled routines. Lives in the vault; `sample-vault/` shows it working with fake demo data.
Success criteria:
- One document is ingested into pages with links, index and log updated.
- A lint report is produced. Hooks are tested with sample input.

## Phase 5. Agent runner: todo
An agent takes a card from the "Next" column, works from its task file, writes the result and moves the card for review.
Success criteria:
- One card runs end to end on a real task, with the owner approving the outcome.
- The agent is limited to the vault and the repository, never reads secrets, and every run is logged.
- Measured results (time to start, manual prompts, rework) are recorded before any claim is published.

## Phase 6. Publish: todo
Pre-publication review of every tracked file, then push to GitHub and make the repository public. The owner links it from the
portfolio by hand.
Success criteria:
- Scanner clean, history contains no personal data, README is accurate about what works.
