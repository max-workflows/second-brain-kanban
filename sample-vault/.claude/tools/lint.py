#!/usr/bin/env python3
"""Deterministic checks for the vault (the mechanical half of the Lint operation).

Usage: python lint.py [vault_dir] [--json]
Exit code 1 when there are errors, 0 otherwise (warnings do not fail).
Judgement checks (contradictions, stale claims) are left to the agent.
"""
import json
import re
import sys
from pathlib import Path

PAGE_DIRS = {"sources": "source", "entities": "entity", "concepts": "concept", "synthesis": "synthesis"}
STATUSES = {"draft", "stable", "conflict"}
REQUIRED = ("type", "title", "created", "updated", "status")
LOG_OPERATIONS = "ingest|query|lint|conflict|resolved|schema"
LOG_HEADING = re.compile(rf"^## \[(\d{{4}}-\d{{2}}-\d{{2}})\] ({LOG_OPERATIONS}) \| \S.*$")
HOTCACHE_HEADING = re.compile(r"^## \d{4}-\d{2}-\d{2}(: | — | - )\S.*$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
FENCE = re.compile(r"```.*?```", re.S)
INLINE_CODE = re.compile(r"`[^`\n]*`")

SECRETS = [
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}"), "GitHub token"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "GitHub token"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"), "API key"),
    (re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{35}\b"), "Telegram bot token"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "private key"),
    (re.compile(r"Bearer\s+[A-Za-z0-9._~+/-]{20,}", re.I), "bearer token"),
    (re.compile(r"https?://hook\.[a-z0-9.-]*make\.com/[A-Za-z0-9]{10,}", re.I), "Make webhook URL"),
    (re.compile(r"https?://[^\s\"'<>]+/webhook(-test)?/[0-9a-f-]{16,}", re.I), "n8n webhook URL"),
    (re.compile(r"(api[_-]?key|secret|token|password)[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_\-/+=]{16,}", re.I), "credential assignment"),
]


def parse_frontmatter(text: str) -> dict[str, str] | None:
    lines = text.replace("\r\n", "\n").split("\n")
    if not lines or lines[0].strip() != "---":
        return None
    try:
        end = lines.index("---", 1)
    except ValueError:
        return None
    data: dict[str, str] = {}
    for line in lines[1:end]:
        if ":" in line and not line.startswith((" ", "\t")):
            key, _, value = line.partition(":")
            data[key.strip()] = value.strip()
    return data


def list_value(raw: str) -> list[str]:
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        raw = raw[1:-1]
    return [item.strip().strip("'\"") for item in raw.split(",") if item.strip()]


def links_in(text: str) -> set[str]:
    text = INLINE_CODE.sub("", FENCE.sub("", text))
    return {Path(m.group(1).strip()).stem if m.group(1).strip().endswith(".md") else m.group(1).strip().split("/")[-1] for m in WIKILINK.finditer(text)}


class Vault:
    def __init__(self, root: Path):
        self.root = root
        self.findings: list[dict] = []

    def add(self, severity: str, rule: str, file: str, message: str) -> None:
        self.findings.append({"severity": severity, "rule": rule, "file": file, "message": message})

    def rel(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()

    def read(self, path: Path) -> str:
        return path.read_text(encoding="utf-8", errors="replace")

    def md_files(self) -> list[Path]:
        return [
            p for p in self.root.rglob("*.md")
            if not any(part.startswith(".") or part == "node_modules" for part in p.relative_to(self.root).parts)
        ]


def check(root: Path) -> tuple[list[dict], dict]:
    v = Vault(root)
    wiki = root / "wiki"
    index, log, hotcache = wiki / "index.md", wiki / "log.md", root / "hotcache.md"

    if not wiki.is_dir():
        v.add("error", "structure", "wiki/", "the wiki folder is missing")
        return v.findings, {"pages": 0, "raw": 0}
    for required in (index, log):
        if not required.is_file():
            v.add("error", "structure", v.rel(required), "file is missing")

    pages: dict[Path, dict[str, str] | None] = {}
    for folder in PAGE_DIRS:
        for page in sorted((wiki / folder).rglob("*.md")) if (wiki / folder).is_dir() else []:
            pages[page] = parse_frontmatter(v.read(page))

    # --- front matter ---
    for page, fm in pages.items():
        name = v.rel(page)
        if fm is None:
            v.add("error", "frontmatter", name, "no front matter block")
            continue
        for key in REQUIRED:
            if not fm.get(key):
                v.add("error", "frontmatter", name, f"missing '{key}'")
        expected = PAGE_DIRS[page.relative_to(wiki).parts[0]]
        if fm.get("type") and fm["type"] != expected:
            v.add("error", "frontmatter", name, f"type is '{fm['type']}' but the folder holds '{expected}' pages")
        if fm.get("status") and fm["status"] not in STATUSES:
            v.add("error", "frontmatter", name, f"status '{fm['status']}' is not one of {sorted(STATUSES)}")
        for key in ("created", "updated"):
            if fm.get(key) and not DATE.match(fm[key]):
                v.add("error", "frontmatter", name, f"'{key}' is not a date (YYYY-MM-DD)")
        if fm.get("created") and fm.get("updated") and DATE.match(fm["created"]) and DATE.match(fm["updated"]) and fm["updated"] < fm["created"]:
            v.add("error", "frontmatter", name, "'updated' is earlier than 'created'")
        if expected == "source":
            sources = list_value(fm.get("sources", ""))
            if not sources:
                v.add("error", "frontmatter", name, "a source page must list its raw file in 'sources'")
            for s in sources:
                if not (root / s).is_file():
                    v.add("warning", "frontmatter", name, f"raw file not found: {s}")

    # --- links and stems ---
    md_files = v.md_files()
    stems: dict[str, list[Path]] = {}
    for p in md_files:
        stems.setdefault(p.stem, []).append(p)
    for stem, paths in stems.items():
        live = [p for p in paths if "_archive" not in p.parts]
        if len(live) > 1:
            v.add("error", "duplicate-name", v.rel(live[0]), f"'{stem}' is used by {len(live)} files, links become ambiguous: " + ", ".join(v.rel(p) for p in live))

    checked = [p for p in md_files if p.is_relative_to(wiki) or p == hotcache or p.is_relative_to(root / "Tasks")]
    inbound: dict[str, set[Path]] = {}
    for p in checked:
        for target in links_in(v.read(p)):
            if target not in stems:
                v.add("error", "broken-link", v.rel(p), f"[[{target}]] points to nothing")
            else:
                inbound.setdefault(target, set()).add(p)

    # --- index ---
    if index.is_file():
        listed = links_in(v.read(index))
        for page in pages:
            if page.stem not in listed:
                v.add("error", "not-in-index", v.rel(page), "page is not listed in wiki/index.md")

    # --- orphans ---
    for page in pages:
        if page.stem.startswith("lint-"):  # lint reports are not meant to be linked from other pages
            continue
        others = {p for p in inbound.get(page.stem, set()) if p not in (page, index, log, hotcache)}
        if not others:
            v.add("warning", "orphan", v.rel(page), "no other page links here")

    # --- raw files that were never ingested ---
    raw_files = [p for p in (root / "raw").rglob("*") if p.is_file() and not p.name.startswith(".")] if (root / "raw").is_dir() else []
    ingested = {s for page, fm in pages.items() if fm and page.relative_to(wiki).parts[0] == "sources" for s in list_value(fm.get("sources", ""))}
    for raw in raw_files:
        if v.rel(raw) not in ingested:
            v.add("warning", "not-ingested", v.rel(raw), "no source page lists this file")

    # --- contradictions ---
    conflict_pages = []
    for page, fm in pages.items():
        has_marker = "⚠️" in v.read(page)
        status = fm.get("status") if fm else None
        if status == "conflict":
            conflict_pages.append(page)
            if not has_marker:
                v.add("error", "conflict", v.rel(page), "status is 'conflict' but there is no ⚠️ note on the page")
        elif has_marker:
            v.add("warning", "conflict", v.rel(page), "has a ⚠️ note but status is not 'conflict'")

    # --- log ---
    if log.is_file():
        dates: list[str] = []
        operations: list[str] = []
        for number, line in enumerate(v.read(log).splitlines(), 1):
            if line.startswith("## "):
                m = LOG_HEADING.match(line)
                if not m:
                    v.add("error", "log-format", f"{v.rel(log)}:{number}", f"not a valid entry heading: {line[:70]!r}")
                else:
                    dates.append(m.group(1))
                    operations.append(m.group(2))
        if dates != sorted(dates, reverse=True):
            v.add("warning", "log-order", v.rel(log), "entries are not newest first")
        if conflict_pages and "conflict" not in operations:
            v.add("warning", "conflict", v.rel(log), "there are pages with status 'conflict' but no 'conflict' entry in the log")

    # --- hotcache ---
    if hotcache.is_file():
        headings = [l for l in v.read(hotcache).splitlines() if l.startswith("## ")]
        if len(headings) > 5:
            v.add("warning", "hotcache", v.rel(hotcache), f"holds {len(headings)} blocks, it should hold exactly five at most")
        for h in headings:
            if not HOTCACHE_HEADING.match(h):
                v.add("warning", "hotcache", v.rel(hotcache), f"block heading should look like '## YYYY-MM-DD: topic': {h[:60]!r}")

    # --- secrets ---
    for p in checked:
        for number, line in enumerate(v.read(p).splitlines(), 1):
            for pattern, label in SECRETS:
                if pattern.search(line):
                    v.add("error", "secret", f"{v.rel(p)}:{number}", f"looks like a {label}; keep only the name of the variable")
                    break

    return v.findings, {"pages": len(pages), "raw": len(raw_files)}


def format_report(root: Path, findings: list[dict], counts: dict) -> str:
    errors = [f for f in findings if f["severity"] == "error"]
    warnings = [f for f in findings if f["severity"] == "warning"]
    lines = [f"Vault: {root.name}", f"Checked {counts['pages']} wiki pages and {counts['raw']} raw files."]
    for title, items in (("ERRORS", errors), ("WARNINGS", warnings)):
        if items:
            lines += ["", f"{title} ({len(items)})"]
            lines += [f"  [{f['rule']}] {f['file']}: {f['message']}" for f in items]
    if not findings:
        lines += ["", "No findings."]
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in argv if not a.startswith("--")]
    root = Path(args[0]).resolve() if args else Path(__file__).resolve().parents[2]
    findings, counts = check(root)
    if "--json" in argv:
        print(json.dumps({"counts": counts, "findings": findings}, ensure_ascii=False, indent=2))
    else:
        print(format_report(root, findings, counts))
    return 1 if any(f["severity"] == "error" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
