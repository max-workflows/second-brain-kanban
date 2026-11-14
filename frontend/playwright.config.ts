import { cpSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// The tests run on a throw-away copy of the sample vault, never on real data.
// The first load of this file creates it; test workers inherit the variable and reuse it.
if (!process.env.E2E_VAULT) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kanban-e2e-"));
  process.env.E2E_VAULT = path.join(dir, "vault");
  cpSync(path.resolve(__dirname, "../sample-vault"), process.env.E2E_VAULT, { recursive: true });
}

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/board/version`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      VAULT_PATH: process.env.E2E_VAULT,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
