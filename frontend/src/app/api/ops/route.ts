import { guardRequest, jsonResponse } from "@/lib/api";
import { applyOp, parseOp } from "@/lib/ops";
import { changeBoard, resolveVault } from "@/lib/vault";

const MAX_BODY = 200_000;

export async function POST(request: Request) {
  const denied = guardRequest(request, { mutating: true });
  if (denied) return denied;

  const text = await request.text();
  if (text.length > MAX_BODY) return jsonResponse({ error: "Request is too large." }, 413);

  let op;
  try {
    op = parseOp(JSON.parse(text));
  } catch {
    op = null;
  }
  if (!op) return jsonResponse({ error: "Invalid operation." }, 400);

  try {
    const { board, version } = await changeBoard(resolveVault(), (current, makeId) => applyOp(current, op, makeId));
    return jsonResponse({ board, version });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Could not save to the vault." }, 500);
  }
}
