"""Black-box tests for the vault hooks: run them as Claude Code does (JSON on stdin, JSON on stdout)."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HOOKS = REPO / "sample-vault" / ".claude" / "hooks"


class HookCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="vault-hooks-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        (self.tmp / ".claude" / "hooks").mkdir(parents=True)
        for name in ("session_start.py", "stop_check.py"):
            shutil.copy(HOOKS / name, self.tmp / ".claude" / "hooks" / name)
        (self.tmp / "wiki").mkdir()

    def write(self, rel: str, text: str, mtime: float | None = None) -> Path:
        path = self.tmp / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        if mtime is not None:
            os.utime(path, (mtime, mtime))
        return path

    def run_hook(self, name: str, stdin: str):
        result = subprocess.run(
            [sys.executable, str(self.tmp / ".claude" / "hooks" / name)],
            input=stdin.encode("utf-8"),
            capture_output=True,
            cwd=self.tmp,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8", "replace"))
        out = result.stdout.decode("utf-8").strip()
        return json.loads(out) if out else None


LOG = "# Log\n\n" + "\n\n".join(
    f"## [2026-11-{day:02d}] ingest | Entry {day}\n- something" for day in range(12, 0, -1)
)
KANBAN = """---

kanban-plugin: board

---

## Backlog

- [ ] [[Tasks/T001-collect|Collect sources]] #research


## In progress

- [ ] [[Tasks/T002-write|Write the summary]] #docs
- [ ] Plain card without a link


## Done

**Complete**

- [x] [[Tasks/T003-done|Already finished]]


%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%
"""


class SessionStartTests(HookCase):
    def context(self) -> str:
        output = self.run_hook("session_start.py", json.dumps({"hook_event_name": "SessionStart", "source": "startup"}))
        self.assertEqual(output["hookSpecificOutput"]["hookEventName"], "SessionStart")
        return output["hookSpecificOutput"]["additionalContext"]

    def test_adds_hotcache_latest_five_log_entries_and_open_work(self):
        self.write("hotcache.md", "# Hotcache\n\n## 2026-11-12: Setup\n- Done: структура\n- Next: перше джерело\n")
        self.write("wiki/log.md", LOG)
        self.write("Kanban.md", KANBAN)
        text = self.context()

        self.assertIn("FIRST ACTION OF THE SESSION", text)
        self.assertIn("## 2026-11-12: Setup", text)
        self.assertIn("Done: структура", text)  # non-latin text survives
        for day in (12, 11, 10, 9, 8):
            self.assertIn(f"## [2026-11-{day:02d}] ingest | Entry {day}", text)
        self.assertNotIn("Entry 7", text)  # only the latest five
        self.assertNotIn("- something", text)  # headings only
        self.assertIn("- Backlog: Collect sources #research", text)
        self.assertIn("- In progress: Write the summary #docs; Plain card without a link", text)
        self.assertNotIn("Already finished", text)  # finished work is left out

    def test_copes_with_an_empty_vault(self):
        text = self.context()
        self.assertIn("(missing or empty)", text)
        self.assertIn("(no entries)", text)
        self.assertIn("(nothing open)", text)

    def test_long_hotcache_is_cut(self):
        self.write("hotcache.md", "x" * 20000)
        self.assertLess(len(self.context()), 8000)

    def test_ignores_garbage_on_stdin(self):
        output = self.run_hook("session_start.py", "this is not json")
        self.assertIn("additionalContext", output["hookSpecificOutput"])


class StopTests(HookCase):
    def setUp(self) -> None:
        super().setUp()
        now = time.time()
        self.index = self.write("wiki/index.md", "# Index\n", now - 100)
        self.log = self.write("wiki/log.md", "# Log\n", now - 100)
        self.now = now

    def stop(self, active=False):
        return self.run_hook("stop_check.py", json.dumps({"hook_event_name": "Stop", "stop_hook_active": active}))

    def test_quiet_when_everything_is_up_to_date(self):
        self.write("wiki/concepts/idea.md", "# Idea\n", self.now - 200)
        self.assertIsNone(self.stop())

    def test_blocks_when_a_page_is_newer_than_index_and_log(self):
        self.write("wiki/concepts/idea.md", "# Idea\n", self.now)
        out = self.stop()
        self.assertEqual(out["decision"], "block")
        self.assertIn("wiki/concepts/idea.md", out["reason"])
        self.assertIn("wiki/index.md", out["reason"])
        self.assertIn("wiki/log.md", out["reason"])

    def test_asks_only_for_what_is_missing(self):
        self.write("wiki/concepts/idea.md", "# Idea\n", self.now - 50)
        os.utime(self.index, (self.now - 10, self.now - 10))  # the index is up to date, the log is not
        out = self.stop()
        self.assertIn("wiki/log.md", out["reason"])
        self.assertNotIn("wiki/index.md:", out["reason"])

    def test_lets_the_session_end_when_it_already_blocked_once(self):
        self.write("wiki/concepts/idea.md", "# Idea\n", self.now)
        self.assertIsNone(self.stop(active=True))

    def test_ignores_files_outside_the_wiki(self):
        self.write("raw/articles/new.md", "text", self.now)
        self.write("hotcache.md", "text", self.now)
        self.assertIsNone(self.stop())

    def test_quiet_without_a_wiki(self):
        shutil.rmtree(self.tmp / "wiki")
        self.assertIsNone(self.stop())

    def test_survives_garbage_on_stdin(self):
        self.assertIsNone(self.run_hook("stop_check.py", "not json"))


if __name__ == "__main__":
    unittest.main()
