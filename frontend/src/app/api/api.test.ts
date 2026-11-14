// @vitest-environment node
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getBoard } from "./board/route";
import { GET as getVersion } from "./board/version/route";
import { POST as postOp } from "./ops/route";

let root: string;
const url = "http://localhost:3000/api";

const get = (headers: Record<string, string> = { host: "localhost:3000" }) => new Request(`${url}/board`, { headers });
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${url}/ops`, {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanban-api-"));
  vi.stubEnv("VAULT_PATH", path.join(root, "vault"));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(root, { recursive: true, force: true });
});

describe("GET /api/board", () => {
  it("returns the board, a version and the vault name", async () => {
    const res = await getBoard(get());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(body.board.columns).toHaveLength(5);
    expect(body.version).toMatch(/^[0-9a-f]{12}$/);
    expect(body.vault).toBe("vault");
  });

  it("says it is a demo when no vault is configured", async () => {
    vi.stubEnv("VAULT_PATH", "");
    vi.spyOn(process, "cwd").mockReturnValue(path.join(root, "frontend"));
    const body = await (await getBoard(get())).json();
    expect(body.vault).toBe("Demo vault");
  });

  it("gives a clear message when the folder is not a vault", async () => {
    await fs.mkdir(path.join(root, "vault"), { recursive: true });
    await fs.writeFile(path.join(root, "vault", "photo.txt"), "x");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await getBoard(get());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Kanban\.md/);
  });
});

describe("GET /api/board/version", () => {
  it("changes after a write", async () => {
    await getBoard(get());
    const before = (await (await getVersion(get())).json()).version;
    await postOp(post({ type: "addCard", columnId: "col-0", title: "Hello" }));
    const after = (await (await getVersion(get())).json()).version;
    expect(after).not.toBe(before);
  });
});

describe("POST /api/ops", () => {
  it("applies an operation and returns the new board", async () => {
    const res = await postOp(post({ type: "addCard", columnId: "col-0", title: "From the API", tags: ["api"] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.values(body.board.cards)).toMatchObject([{ title: "From the API", tags: ["api"] }]);
    expect(await fs.readFile(path.join(root, "vault", "Kanban.md"), "utf8")).toContain("From the API");
  });

  it.each([
    ["not JSON", "{oops"],
    ["unknown type", { type: "format-disk" }],
    ["wrong field types", { type: "addCard", columnId: 5, title: [] }],
  ])("rejects %s with 400", async (_name, body) => {
    expect((await postOp(post(body))).status).toBe(400);
  });

  it("rejects a huge body with 413", async () => {
    expect((await postOp(post("x".repeat(300_000)))).status).toBe(413);
  });
});

describe("who may call the API", () => {
  it("refuses a request addressed to another host name", async () => {
    expect((await getBoard(get({ host: "evil.example:3000" }))).status).toBe(403);
    expect((await postOp(post({ type: "deleteCard", id: "x" }, { host: "192.168.1.5:3000" }))).status).toBe(403);
  });

  it("refuses a request that comes from another site", async () => {
    expect((await getBoard(get({ host: "localhost:3000", origin: "https://evil.example" }))).status).toBe(403);
    expect((await postOp(post({ type: "deleteCard", id: "x" }, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await getBoard(get({ host: "localhost:3000", "sec-fetch-site": "cross-site" }))).status).toBe(403);
  });

  it("accepts the app's own origin", async () => {
    expect((await getBoard(get({ host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }))).status).toBe(200);
    expect((await getBoard(get({ host: "127.0.0.1:3000" }))).status).toBe(200);
    expect((await getBoard(get({ host: "[::1]:3000" }))).status).toBe(200);
  });

  it("refuses changes that are not sent as JSON", async () => {
    const res = await postOp(post("type=deleteCard", { "content-type": "application/x-www-form-urlencoded" }));
    expect(res.status).toBe(415);
  });
});
