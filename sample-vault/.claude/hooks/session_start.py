#!/usr/bin/env python3
"""SessionStart hook.

Puts three things into the agent's context: hotcache.md, the headings of the latest log entries and the open work
on the board (Kanban.md). Reminds the agent to record the previous session in hotcache.md first.
Reads the hook JSON from stdin, prints the hook JSON to stdout.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG_HEADING = re.compile(r"^## \[\d{4}-\d{2}-\d{2}\] ")
CARD = re.compile(r"^- \[[ xX]\] (.*)$")
LINK_WITH_ALIAS = re.compile(r"\[\[[^\]|]*\|([^\]]*)\]\]")
LINK_PLAIN = re.compile(r"\[\[([^\]]*)\]\]")
MAX_HOTCACHE = 6000
LATEST_LOG_ENTRIES = 5
MAX_CARDS_PER_COLUMN = 10

REMINDER = (
    "FIRST ACTION OF THE SESSION: before the owner's request, update hotcache.md. Add a block about the PREVIOUS "
    "session at the top ('## YYYY-MM-DD: topic' with lines 'Done' and 'Next'), keep exactly five blocks and drop the sixth. "
    "Base it on the log entries below. Do not invent: if you cannot tell what was done, say so. "
    "Skip this if the newest block already covers the latest log entry."
)


def read(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def clean_card(text: str) -> str:
    text = LINK_WITH_ALIAS.sub(r"\1", text)
    return LINK_PLAIN.sub(r"\1", text).strip()


def board_snapshot(kanban: str) -> str:
    """One line per column with its open cards. Columns that hold finished work (marked **Complete**) are left out."""
    lines: list[str] = []
    title: str | None = None
    cards: list[str] = []
    complete = False

    def flush() -> None:
        if title is not None and not complete and cards:
            shown = cards[:MAX_CARDS_PER_COLUMN]
            more = f" (+{len(cards) - len(shown)} more)" if len(cards) > len(shown) else ""
            lines.append(f"- {title}: " + "; ".join(shown) + more)

    for line in kanban.splitlines():
        if line.startswith("## "):
            flush()
            title, cards, complete = line[3:].strip(), [], False
        elif line.strip() == "**Complete**":
            complete = True
        elif (m := CARD.match(line)) and title is not None:
            cards.append(clean_card(m.group(1)))
    flush()
    return "\n".join(lines)


def build_context(root: Path) -> str:
    hotcache = read(root / "hotcache.md")
    log = read(root / "wiki" / "log.md")
    kanban = read(root / "Kanban.md")

    headings = [l.strip() for l in (log or "").splitlines() if LOG_HEADING.match(l)][:LATEST_LOG_ENTRIES]
    board = board_snapshot(kanban) if kanban else ""

    parts = [
        REMINDER,
        "=== hotcache.md ===\n" + ((hotcache or "").strip()[:MAX_HOTCACHE] or "(missing or empty)"),
        "=== wiki/log.md: latest entries (headings, newest first) ===\n" + ("\n".join(headings) or "(no entries)"),
        "=== Board: open work (Kanban.md) ===\n" + (board or "(nothing open)"),
    ]
    return "\n\n".join(parts)


def main() -> None:
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        json.load(sys.stdin)  # the content is not needed, but reading avoids a broken pipe
    except ValueError:
        pass
    output = {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": build_context(ROOT)}}
    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
