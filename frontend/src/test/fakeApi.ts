import { vi } from "vitest";
import type { Board } from "@/lib/board";
import { applyOp } from "@/lib/ops";
import { sampleBoard } from "./fixtures";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

/** Stands in for the server in component tests: same operations, state kept in memory. */
export function installFakeApi(initial: Board = sampleBoard()) {
  let board = initial;
  let version = 1;
  let counter = 0;
  const ops: unknown[] = [];
  let failNextOp = false;
  let failBoard = false;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/board/version")) return json({ version: String(version) });
    if (url.endsWith("/api/board")) {
      return failBoard ? json({ error: "The vault is unreachable." }, 500) : json({ board, version: String(version), vault: "Test vault" });
    }
    if (url.endsWith("/api/ops")) {
      if (failNextOp) {
        failNextOp = false;
        return json({ error: "Could not save the change." }, 500);
      }
      const op = JSON.parse(String(init?.body));
      ops.push(op);
      board = applyOp(board, op, (title) => `T${String(++counter).padStart(3, "0")}-${title.toLowerCase().replace(/\W+/g, "-")}`);
      version += 1;
      return json({ board, version: String(version) });
    }
    return json({ error: "not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);

  return {
    ops,
    getBoard: () => board,
    /** Simulates a change made outside the app (for example in Obsidian). */
    changeExternally(next: Board) {
      board = next;
      version += 1;
    },
    failNextOp: () => {
      failNextOp = true;
    },
    failBoardLoad: (value = true) => {
      failBoard = value;
    },
  };
}
