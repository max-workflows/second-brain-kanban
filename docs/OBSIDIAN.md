# Using the vault in Obsidian

The vault is a plain folder of Markdown files, so Obsidian opens it as it is. Open the vault folder itself
(for example `vault-data/` or `sample-vault/`), not the whole repository.

## Setup

1. In Obsidian choose "Open folder as vault" and pick the vault folder.
2. Settings, Files and links, "Excluded files": add `.claude/` and `Tasks/_archive/`. They stay on disk but leave search
   and the graph, so hooks and archived cards do not clutter them.
3. Optional: install the community plugin "Kanban" to see `Kanban.md` as a board inside Obsidian.
   Without it the file is still readable as a checklist, and the web board in `frontend/` shows it as a board.

Obsidian keeps its own settings in `.obsidian/`. That folder is not part of the repository.

## Two-way editing

The web board and Obsidian read and write the same files. The board polls the disk, so a change made in Obsidian shows up
within about two seconds, and a change made on the board shows up in Obsidian as soon as the file is written.

Quick check:

1. Start the board with `VAULT_PATH` pointing at the vault.
2. Add a card on the board. `Kanban.md` gets a new line and `Tasks/` gets a new file.
3. In Obsidian, open `Kanban.md`, move the line to another column, and save. The board shows the card in the new column.

## Tips

- The card title is a link to its task file. Click it to read or edit the details.
- Wiki pages and task files can link to each other by name, for example `[[n8n]]`.
- Do not rename or move files in `Tasks/` by hand. The board relies on the `T###` id in the file name.
- If Obsidian and the board change the same file at the same moment, the board re-reads the file before writing, so the
  last complete save wins and nothing is half-written.
