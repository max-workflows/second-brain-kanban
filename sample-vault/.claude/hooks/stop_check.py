#!/usr/bin/env python3
"""Stop hook.

Does not let the session end while a wiki page is newer than wiki/index.md or wiki/log.md,
because then the catalog or the journal was not updated.
When the hook already blocked once (stop_hook_active), it lets the session end, so it can never loop.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def find_problem(root: Path) -> str | None:
    wiki = root / "wiki"
    index, log = wiki / "index.md", wiki / "log.md"
    if not (wiki.is_dir() and index.is_file() and log.is_file()):
        return None

    pages = [p for p in wiki.rglob("*.md") if p not in (index, log)]
    stale: list[tuple[Path, list[Path]]] = []
    for service in (index, log):
        newer = [p for p in pages if p.stat().st_mtime > service.stat().st_mtime]
        if newer:
            stale.append((service, newer))
    if not stale:
        return None

    changed = sorted({p for _, ps in stale for p in ps}, key=lambda p: p.stat().st_mtime, reverse=True)
    lines = ["Do not finish yet: some wiki pages are newer than the catalog or the journal.", "", "Changed pages:"]
    lines += [f"- {p.relative_to(root).as_posix()}" for p in changed]
    lines += ["", "Still to do:"]
    for service, _ in stale:
        if service == index:
            lines.append("- wiki/index.md: add the new pages (one line each) and update the lines of changed ones.")
        else:
            lines.append("- wiki/log.md: add a new entry at the TOP: '## [YYYY-MM-DD] operation | title' and a list of changes.")
    lines.append("If needed, also update hotcache.md. Then you can finish.")
    return "\n".join(lines)


def main() -> None:
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        data = json.load(sys.stdin)
    except ValueError:
        data = {}
    if isinstance(data, dict) and data.get("stop_hook_active") is True:
        return
    problem = find_problem(ROOT)
    if problem:
        print(json.dumps({"decision": "block", "reason": problem}, ensure_ascii=False))


if __name__ == "__main__":
    main()
