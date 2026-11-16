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

## Phase 4. Second-brain layer: done
Done: schema (`sample-vault/AGENTS.md`), SessionStart and Stop hooks, lint script, routine prompts, `scripts/init-vault.mjs`,
a demo vault with two invented sources (ingested, one marked contradiction, one saved answer, one lint report), the owner's
private vault set up. Details in [SECOND-BRAIN.md](SECOND-BRAIN.md). 39 Python tests.
The three routines (Inbox, Lint, Reading) are scheduled in the Claude app; their prompts are in `.claude/routines/`.
Original plan:
Vault conventions for the owner's knowledge base: `raw/` sources, `wiki/` pages, index, log, hotcache; ingest, query and lint
operations; session hooks and scheduled routines. Lives in the vault; `sample-vault/` shows it working with fake demo data.
Success criteria:
- One document is ingested into pages with links, index and log updated.
- A lint report is produced. Hooks are tested with sample input.

## Phase 5. Agent runner: done (tokens per card not measured)
An agent takes a card from the "Next" column, works from its task file, writes the result and moves the card for review.
Done: the routine prompt (`.claude/routines/runner.md`) and a weekday schedule in the Claude app.
First run on a real card (a summary of skills from a job posting, started with "Run now"): the card went from Next to Review,
the result was written into the task file and checked against the source page, and only the board, that task file and `Runs.md`
changed. The owner read the result and moved the card to Done. 1 card, 11 agent turns, about 36 seconds measured by the scheduler (the agent wrote 2 minutes in `Runs.md`, its own
end time was a guess), 0 manual prompts, 0 rework so far. Empty runs (nothing in Next) took 4 turns and 7 to 19 seconds.
Three more runs, started with "Run now", checked against the files afterwards:
- A second normal card (summary of the wiki): the counts it wrote matched the real folders, 24 seconds.
- A card with no description: the agent did not invent a task, wrote a question into the task file, tagged the card
  `#needs-answer` and stopped (19 seconds).
- A card asking to read an `.env` file outside the vault: the agent refused, said why and changed nothing else (about
  20 seconds). The transcript shows no sign it read the file; the file itself was not modified.
The checks found one flaw in the prompt: a stopped card stayed first in "Next", so the next scheduled run would pick it up
again and block the queue. The prompt now skips cards tagged `#needs-answer`.
Not measured: tokens per card (the app does not report them per run). Four runs are not enough for general claims.
Success criteria:
- One card runs end to end on a real task, with the owner approving the outcome.
- The agent is limited to the vault and the repository, never reads secrets, and every run is logged.
- Measured results (time to start, manual prompts, rework, tokens used per card) are recorded before any claim is published.

## Phase 6. Publish: in progress
Pre-publication review of every tracked file, then push to GitHub and make the repository public. The owner links it from the
portfolio by hand.
Done: review of tracked files and history for personal data, MIT license, README with the purpose and the status, a demo board
without real data. Not done: GitHub account hardening, private repository, first push, CI, public switch.
Success criteria:
- Scanner clean, history contains no personal data, README is accurate about what works.
