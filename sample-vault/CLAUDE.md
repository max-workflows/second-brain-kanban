@AGENTS.md

## Claude Code notes

- At the start of a session the hooks add hotcache.md, the latest log entries and the cards in progress to your context.
  First, add a block about the previous session to hotcache.md (keep exactly five).
- Use `python` for scripts on this machine.
- When you finish an operation, make sure `wiki/index.md` and `wiki/log.md` are updated; a hook blocks the end of the session otherwise.
