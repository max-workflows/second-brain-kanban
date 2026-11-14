"""A vault made by scripts/init-vault.mjs must pass lint and work with the hooks, with no extra setup."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "scripts" / "init-vault.mjs"


class FreshVaultTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="vault-init-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.vault = self.tmp / "vault"
        subprocess.run(["node", str(SCRIPT), str(self.vault)], check=True, capture_output=True, timeout=60)

    def run_py(self, rel: str, *args: str, stdin: str = "{}"):
        return subprocess.run(
            [sys.executable, str(self.vault / rel), *args], input=stdin.encode(), capture_output=True, timeout=30, cwd=self.vault
        )

    def test_passes_its_own_lint(self):
        result = self.run_py(".claude/tools/lint.py", str(self.vault))
        self.assertEqual(result.returncode, 0, result.stdout.decode("utf-8", "replace"))
        self.assertIn("No findings.", result.stdout.decode("utf-8"))

    def test_session_start_hook_sees_the_new_vault(self):
        out = json.loads(self.run_py(".claude/hooks/session_start.py").stdout.decode("utf-8"))
        text = out["hookSpecificOutput"]["additionalContext"]
        self.assertIn("Vault created", text)
        self.assertIn("schema | Vault created", text)
        self.assertIn("(nothing open)", text)

    def test_stop_hook_lets_a_new_vault_finish(self):
        self.assertEqual(self.run_py(".claude/hooks/stop_check.py").stdout.decode("utf-8").strip(), "")


if __name__ == "__main__":
    unittest.main()
