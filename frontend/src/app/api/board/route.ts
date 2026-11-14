import path from "node:path";
import { guardRequest, jsonResponse } from "@/lib/api";
import { readBoard, resolveVault } from "@/lib/vault";

export async function GET(request: Request) {
  const denied = guardRequest(request, { mutating: false });
  if (denied) return denied;
  try {
    const vault = resolveVault();
    const { board, version } = await readBoard(vault);
    return jsonResponse({ board, version, vault: vault.demo ? "Demo vault" : path.basename(vault.dir) });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && /Kanban\.md/.test(error.message) ? error.message : "Could not read the vault.";
    return jsonResponse({ error: message }, 500);
  }
}
