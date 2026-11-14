"""Tests for the vault lint script, one rule at a time, on small throw-away vaults."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LINT = REPO / "sample-vault" / ".claude" / "tools" / "lint.py"

sys.path.insert(0, str(LINT.parent))
import lint  # noqa: E402


def page(kind: str, title: str, body: str = "", sources: str = "[]", status: str = "draft", created: str = "2026-11-01", updated: str = "2026-11-02") -> str:
    return f"---\ntype: {kind}\ntitle: {title}\ncreated: {created}\nupdated: {updated}\nsources: {sources}\nstatus: {status}\n---\n\n# {title}\n\n{body}\n"


class LintCase(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="vault-lint-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        self.write("wiki/index.md", "# Index\n")
        self.write("wiki/log.md", "# Log\n")
        self.write("hotcache.md", "# Hotcache\n")

    def write(self, rel: str, text: str) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def run_lint(self):
        findings, counts = lint.check(self.root)
        return findings

    def rules(self, severity: str | None = None) -> list[str]:
        return [f["rule"] for f in self.run_lint() if severity is None or f["severity"] == severity]

    def index_all(self, *stems: str) -> None:
        self.write("wiki/index.md", "# Index\n\n" + "\n".join(f"- [[{s}]] — one line" for s in stems) + "\n")


class CleanVaultTests(LintCase):
    def test_a_well_formed_vault_has_no_findings(self):
        self.write("raw/articles/2026-11-01-a.md", "source text")
        self.write("wiki/sources/a.md", page("source", "A", "See [[idea]].", sources="[raw/articles/2026-11-01-a.md]"))
        self.write("wiki/concepts/idea.md", page("concept", "Idea", "From [[a]]."))
        self.index_all("a", "idea")
        self.write("wiki/log.md", "# Log\n\n## [2026-11-02] ingest | A\n- created\n\n## [2026-11-01] schema | Start\n- init\n")
        self.write("hotcache.md", "# Hotcache\n\n## 2026-11-02: Ingest A\n- Done: x\n- Next: y\n")
        self.assertEqual(self.run_lint(), [])

    def test_missing_wiki_is_an_error(self):
        shutil.rmtree(self.root / "wiki")
        self.assertEqual(self.rules("error"), ["structure"])


class FrontmatterTests(LintCase):
    def test_missing_block_keys_type_status_and_dates(self):
        self.write("wiki/concepts/none.md", "# No front matter\n")
        self.write("wiki/concepts/partial.md", "---\ntype: concept\ntitle: P\n---\n")
        self.write("wiki/concepts/wrong-type.md", page("entity", "W"))
        self.write("wiki/concepts/bad-status.md", page("concept", "B", status="done"))
        self.write("wiki/concepts/bad-date.md", page("concept", "D", created="yesterday"))
        self.write("wiki/concepts/backwards.md", page("concept", "R", created="2026-11-05", updated="2026-11-01"))
        self.index_all("none", "partial", "wrong-type", "bad-status", "bad-date", "backwards")
        messages = " | ".join(f["message"] for f in self.run_lint() if f["rule"] == "frontmatter")
        for expected in ("no front matter", "missing 'created'", "missing 'status'", "folder holds 'concept'", "not one of", "not a date", "earlier than 'created'"):
            self.assertIn(expected, messages)

    def test_source_page_needs_an_existing_raw_file(self):
        self.write("wiki/sources/a.md", page("source", "A", sources="[]"))
        self.write("wiki/sources/b.md", page("source", "B", sources="[raw/articles/missing.md]"))
        self.index_all("a", "b")
        by_file = {f["file"]: f for f in self.run_lint() if f["rule"] == "frontmatter"}
        self.assertEqual(by_file["wiki/sources/a.md"]["severity"], "error")
        self.assertEqual(by_file["wiki/sources/b.md"]["severity"], "warning")


class LinkTests(LintCase):
    def test_broken_link_is_an_error_but_code_samples_are_ignored(self):
        self.write("wiki/concepts/idea.md", page("concept", "Idea", "Points to [[nowhere]]. Syntax sample: `[[example]]`.\n\n```\n[[also-ignored]]\n```"))
        self.index_all("idea")
        broken = [f for f in self.run_lint() if f["rule"] == "broken-link"]
        self.assertEqual([f["message"] for f in broken], ["[[nowhere]] points to nothing"])

    def test_alias_and_path_forms_resolve(self):
        self.write("wiki/concepts/idea.md", page("concept", "Idea", "[[other|an alias]] and [[wiki/concepts/other]] and [[Tasks/T001-x|Task]]."))
        self.write("wiki/concepts/other.md", page("concept", "Other", "Back to [[idea]]."))
        self.write("Tasks/T001-x.md", "# Task\n")
        self.index_all("idea", "other")
        self.assertNotIn("broken-link", self.rules())

    def test_a_task_file_with_a_broken_link_is_reported(self):
        self.write("Tasks/T001-x.md", "# Task\n\nSee [[gone]]\n")
        self.assertIn("broken-link", self.rules("error"))

    def test_a_source_page_may_not_share_the_name_of_its_raw_file(self):
        self.write("raw/articles/a.md", "source text")
        self.write("wiki/sources/a.md", page("source", "A", sources="[raw/articles/a.md]"))
        self.index_all("a")
        findings = [f for f in self.run_lint() if f["rule"] == "duplicate-name"]
        self.assertEqual(len(findings), 1)
        self.assertIn("raw/articles/a.md", findings[0]["message"])

    def test_duplicate_file_names_are_an_error(self):
        self.write("wiki/concepts/same.md", page("concept", "S1"))
        self.write("wiki/entities/same.md", page("entity", "S2"))
        self.index_all("same")
        self.assertIn("duplicate-name", self.rules("error"))


class IndexAndOrphanTests(LintCase):
    def test_page_missing_from_the_index(self):
        self.write("wiki/concepts/idea.md", page("concept", "Idea"))
        self.assertIn("not-in-index", self.rules("error"))

    def test_orphan_page_is_a_warning(self):
        self.write("wiki/concepts/lonely.md", page("concept", "Lonely"))
        self.index_all("lonely")  # only the index links to it
        self.assertEqual(self.rules(), ["orphan"])

    def test_lint_reports_are_not_expected_to_be_linked(self):
        self.write("wiki/synthesis/lint-2026-11-14.md", page("synthesis", "Lint 2026-11-14"))
        self.index_all("lint-2026-11-14")
        self.assertEqual(self.rules(), [])

    def test_a_link_from_another_page_ends_the_orphan_warning(self):
        self.write("wiki/concepts/a.md", page("concept", "A", "[[b]]"))
        self.write("wiki/concepts/b.md", page("concept", "B", "[[a]]"))
        self.index_all("a", "b")
        self.assertEqual(self.rules(), [])


class RawTests(LintCase):
    def test_raw_file_without_a_source_page(self):
        self.write("raw/articles/new.md", "text")
        self.write("raw/other/.gitkeep", "")
        findings = [f for f in self.run_lint() if f["rule"] == "not-ingested"]
        self.assertEqual([f["file"] for f in findings], ["raw/articles/new.md"])
        self.assertEqual(findings[0]["severity"], "warning")


class ConflictTests(LintCase):
    def test_conflict_status_needs_a_marker_and_a_log_entry(self):
        self.write("wiki/concepts/a.md", page("concept", "A", "[[b]]", status="conflict"))
        self.write("wiki/concepts/b.md", page("concept", "B", "[[a]] ⚠️ Contradiction: [[a]] says X.", status="conflict"))
        self.index_all("a", "b")
        findings = [f for f in self.run_lint() if f["rule"] == "conflict"]
        by_severity = {(f["severity"], f["file"]) for f in findings}
        self.assertIn(("error", "wiki/concepts/a.md"), by_severity)  # no marker on a
        self.assertIn(("warning", "wiki/log.md"), by_severity)  # no log entry

    def test_marker_without_conflict_status_is_a_warning(self):
        self.write("wiki/concepts/a.md", page("concept", "A", "[[b]] ⚠️ look"))
        self.write("wiki/concepts/b.md", page("concept", "B", "[[a]]"))
        self.index_all("a", "b")
        self.assertEqual(self.rules(), ["conflict"])

    def test_a_logged_conflict_is_fine(self):
        self.write("wiki/concepts/a.md", page("concept", "A", "[[b]] ⚠️ Contradiction", status="conflict"))
        self.write("wiki/concepts/b.md", page("concept", "B", "[[a]] ⚠️ Contradiction", status="conflict"))
        self.index_all("a", "b")
        self.write("wiki/log.md", "# Log\n\n## [2026-11-02] conflict | A vs B\n- x\n")
        self.assertEqual(self.rules(), [])


class LogAndHotcacheTests(LintCase):
    def test_entry_headings_must_follow_the_format(self):
        self.write("wiki/log.md", "# Log\n\n## [2026-11-02] ingest | Good\n\n## Format: [YYYY-MM-DD] operation | title\n\n## [2026-11-01] cooking | Bad operation\n")
        errors = [f["message"] for f in self.run_lint() if f["rule"] == "log-format"]
        self.assertEqual(len(errors), 2)

    def test_entries_must_be_newest_first(self):
        self.write("wiki/log.md", "# Log\n\n## [2026-11-01] ingest | Older first\n\n## [2026-11-02] ingest | Newer second\n")
        self.assertEqual(self.rules(), ["log-order"])

    def test_hotcache_keeps_at_most_five_blocks_with_a_valid_heading(self):
        blocks = "\n".join(f"## 2026-11-0{n}: Session {n}\n- Done: x\n" for n in range(1, 7))
        self.write("hotcache.md", "# Hotcache\n\n" + blocks + "\n## Untitled\n")
        messages = [f["message"] for f in self.run_lint() if f["rule"] == "hotcache"]
        self.assertTrue(any("holds 7 blocks" in m for m in messages))
        self.assertTrue(any("YYYY-MM-DD" in m for m in messages))

    def test_the_em_dash_heading_style_is_accepted(self):
        self.write("hotcache.md", "# Hotcache\n\n## 2026-11-02 — Session\n- Done: x\n")
        self.assertEqual(self.rules(), [])


class SecretTests(LintCase):
    def test_secrets_are_found_in_wiki_hotcache_and_tasks_but_not_in_raw(self):
        token = "ghp" + "_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8"
        telegram = "1234567890" + ":" + "AAH" + "x" * 32
        self.write("wiki/concepts/idea.md", page("concept", "Idea", f"token {token}"))
        self.write("hotcache.md", f"# Hotcache\n\n## 2026-11-02: S\n- Done: bot {telegram}\n")
        self.write("Tasks/T001-x.md", "# T\n\nhttps://hook.eu1." + "make" + ".com/abcdefghij1234567890\n")
        self.write("raw/articles/leaky.md", f"raw keeps what it received {token}")
        self.index_all("idea")
        files = {f["file"].split(":")[0] for f in self.run_lint() if f["rule"] == "secret"}
        self.assertEqual(files, {"wiki/concepts/idea.md", "hotcache.md", "Tasks/T001-x.md"})

    def test_a_secret_is_never_echoed_in_the_report(self):
        token = "ghp" + "_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8"
        self.write("wiki/concepts/idea.md", page("concept", "Idea", token))
        self.index_all("idea")
        findings, counts = lint.check(self.root)
        self.assertNotIn(token, lint.format_report(self.root, findings, counts))


class CommandLineTests(LintCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(LINT), str(self.root), *args], capture_output=True, timeout=30)

    def test_exit_code_and_text_report(self):
        clean = self.run_cli()
        self.assertEqual(clean.returncode, 0)
        self.assertIn("No findings.", clean.stdout.decode("utf-8"))

        self.write("wiki/concepts/idea.md", page("concept", "Idea"))  # not in the index
        broken = self.run_cli()
        self.assertEqual(broken.returncode, 1)
        self.assertIn("[not-in-index] wiki/concepts/idea.md", broken.stdout.decode("utf-8"))

    def test_json_report(self):
        self.write("wiki/concepts/idea.md", page("concept", "Idea"))
        out = json.loads(self.run_cli("--json").stdout.decode("utf-8"))
        self.assertEqual(out["counts"]["pages"], 1)
        self.assertEqual({f["rule"] for f in out["findings"]}, {"not-in-index", "orphan"})


if __name__ == "__main__":
    unittest.main()
