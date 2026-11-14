# Vault format

The board is stored as plain Markdown, so a person, Obsidian and an AI agent all read the same files.
No database. The app finds the vault through `VAULT_PATH`; without it, it works on a throw-away copy of `sample-vault/`.

```
Kanban.md                 the board
Tasks/T001-some-title.md  one file per card
Tasks/_archive/           files of deleted cards (never erased)
```

## Kanban.md

Compatible with the Obsidian Kanban plugin.

```markdown
---

kanban-plugin: board

---

## Backlog

- [ ] [[Tasks/T001-plan-the-week|Plan the week]] #planning #docs


## Done

**Complete**

- [x] [[Tasks/T002-ship-it|Ship it]]


%% kanban:settings
...
%%
```

- Each `##` heading is a column. A card's status is its column; task files do not repeat it.
- Each card is one line: a link to its task file, then tags. The text after `|` is the card title.
- Tags are `#lowercase-words`. A tag cannot be only digits.
- The app keeps everything else as it found it: front matter, notes under a column heading (such as `**Complete**`), indented lines
  under a card, and everything from `***` or `%% kanban:settings` to the end of the file.

## Task files

```markdown
---
created: 2026-11-14
---

# Plan the week

Free-form details in Markdown.
```

- The first heading is the card title. Everything after it is the card's details, shown in the card and in the editor.
- Extra front matter keys added by hand are kept.
- File names are `T<number>-<slug>.md`. New cards get the next free number.

## Changes made outside the app

- The app checks the files every two seconds and reloads when they change, so edits in Obsidian appear without a refresh.
- A card line without a task link (for example typed into the Kanban plugin) gets a task file and a link the next time the board is read.
- Every change re-reads the files first and writes atomically, so edits from two places do not overwrite each other.
- A deleted card moves its task file to `Tasks/_archive/`.
