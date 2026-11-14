import { promises as fs } from "node:fs";
import path from "node:path";

export const vaultDir = () => process.env.E2E_VAULT!;
export const readVaultFile = (...parts: string[]) => fs.readFile(path.join(vaultDir(), ...parts), "utf8");
export const writeVaultFile = (rel: string, text: string) => fs.writeFile(path.join(vaultDir(), rel), text, "utf8");
export const exists = (...parts: string[]) =>
  fs.access(path.join(vaultDir(), ...parts)).then(() => true, () => false);

/** Puts the throw-away vault back to the sample content before each test. */
export async function resetVault() {
  const sample = path.resolve(__dirname, "../../sample-vault");
  await fs.rm(vaultDir(), { recursive: true, force: true });
  await fs.cp(sample, vaultDir(), { recursive: true });
}
