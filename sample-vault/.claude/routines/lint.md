# Routine: Lint

Schedule: every Monday, 09:30. Open the task in the vault folder.

Prompt:

> Read AGENTS.md and follow it exactly. Run the Lint operation.
> Start with `python .claude/tools/lint.py`. Fix mechanical findings (links, index lines, front matter) without deleting anything.
> Then do the judgement checks and only propose changes for them.
> Delete nothing and rewrite no content. Save the report as `wiki/synthesis/lint-YYYY-MM-DD.md` (today's date),
> add it to `wiki/index.md`, and add a `lint` entry at the top of `wiki/log.md`.
> End by saying how many findings there were, how many you fixed and where the report is.
