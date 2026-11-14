import { guardRequest, jsonResponse } from "@/lib/api";
import { boardVersion, resolveVault } from "@/lib/vault";

export async function GET(request: Request) {
  const denied = guardRequest(request, { mutating: false });
  if (denied) return denied;
  try {
    return jsonResponse({ version: await boardVersion(resolveVault()) });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Could not read the vault." }, 500);
  }
}
