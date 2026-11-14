import { expect, test, type Page } from "@playwright/test";
import { exists, readVaultFile, resetVault, writeVaultFile } from "./helpers";

const column = (page: Page, name: string) => page.getByRole("region", { name });

let problems: string[] = [];

test.beforeEach(async ({ page }) => {
  await resetVault();
  problems = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "Backlog" })).toBeVisible();
});

test.afterEach(() => {
  expect(problems, "the browser console should stay free of errors").toEqual([]);
});

test("shows five columns with the sample cards and tags", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Backlog", "Next", "In progress", "Review", "Done"]);
  await expect(column(page, "Backlog").getByText("Plan the weekly review")).toBeVisible();
  await expect(column(page, "Backlog").getByText("#planning")).toBeVisible();
  await expect(column(page, "Backlog").getByLabel("2 cards")).toBeVisible();
});

test("adds a card and keeps it after a reload", async ({ page }) => {
  const review = column(page, "Review");
  await review.getByRole("button", { name: "+ Add a card" }).click();
  await review.getByLabel("Card title").fill("Write release notes");
  await review.getByLabel("Card details").fill("Short and clear.");
  await review.getByLabel("Card tags").fill("#docs ops");
  await review.getByRole("button", { name: "Add card" }).click();
  await expect(review.getByText("Write release notes")).toBeVisible();

  await page.reload();
  await expect(review.getByText("Write release notes")).toBeVisible();
  await expect(review.getByText("#ops")).toBeVisible();
  expect(await readVaultFile("Kanban.md")).toContain("[[Tasks/T009-write-release-notes|Write release notes]] #docs #ops");
  expect(await readVaultFile("Tasks", "T009-write-release-notes.md")).toContain("Short and clear.");
});

test("edits a card in the dialog and writes the task file", async ({ page }) => {
  await column(page, "Next").getByText("Design the card layout").click();
  const dialog = page.getByRole("dialog", { name: "Edit card" });
  await expect(dialog.getByText("Tasks/T003-design-the-card-layout.md")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("Design the card");
  await dialog.getByRole("textbox", { name: "Details", exact: true }).fill("Now with new details.");
  await dialog.getByRole("textbox", { name: "Tags", exact: true }).fill("#ux");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(column(page, "Next").getByText("Design the card", { exact: true })).toBeVisible();

  await page.reload();
  await expect(column(page, "Next").getByText("Now with new details.")).toBeVisible();
  expect(await readVaultFile("Tasks", "T003-design-the-card-layout.md")).toBe(
    "---\ncreated: 2026-11-02\n---\n\n# Design the card\n\nNow with new details.\n",
  );
  expect(await readVaultFile("Kanban.md")).toContain("[[Tasks/T003-design-the-card-layout|Design the card]] #ux");
});

test("renames a column and keeps the name", async ({ page }) => {
  await page.getByRole("button", { name: "Column options for Backlog" }).click();
  await page.getByRole("menuitem", { name: "Rename column" }).click();
  await page.getByLabel("Rename column Backlog").fill("Ideas");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "Ideas" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Ideas" })).toBeVisible();
  expect(await readVaultFile("Kanban.md")).toContain("## Ideas");
});

test("deletes a card but keeps its file in the archive", async ({ page }) => {
  await page.getByRole("button", { name: "Card options for Write onboarding notes", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete card" }).click();
  await expect(page.getByText("Write onboarding notes")).toBeHidden();

  await page.reload();
  await expect(page.getByText("Write onboarding notes")).toBeHidden();
  expect(await exists("Tasks", "T002-write-onboarding-notes.md")).toBe(false);
  expect(await readVaultFile("Tasks", "_archive", "T002-write-onboarding-notes.md")).toContain("# Write onboarding notes");
  expect(await readVaultFile("Kanban.md")).not.toContain("T002");
});

test("moves a card between columns by dragging and keeps the order", async ({ page }) => {
  const from = (await column(page, "Backlog").getByText("Plan the weekly review").boundingBox())!;
  const to = (await column(page, "In progress").getByText("Build drag and drop").boundingBox())!;
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y + 30, { steps: 5 });
  await page.mouse.move(to.x + 10, to.y + 2, { steps: 20 });
  await page.mouse.up();

  const inProgress = column(page, "In progress");
  await expect(inProgress.getByText("Plan the weekly review")).toBeVisible();
  await expect(inProgress.getByLabel("2 cards")).toBeVisible();
  await expect(column(page, "Backlog").getByLabel("1 cards")).toBeVisible();

  await page.reload();
  await expect(column(page, "In progress").getByText("Plan the weekly review")).toBeVisible();
  const text = await readVaultFile("Kanban.md");
  expect(text.indexOf("T001")).toBeGreaterThan(text.indexOf("## In progress"));
  expect(text.indexOf("T001")).toBeLessThan(text.indexOf("T005")); // dropped above the card it was dragged onto
  expect(text.indexOf("T005")).toBeLessThan(text.indexOf("## Review"));
});

test("shows a change made outside the app without a reload", async ({ page }) => {
  const kanban = await readVaultFile("Kanban.md");
  await writeVaultFile("Kanban.md", kanban.replace("## Backlog\n\n", "## Backlog\n\n- [ ] Added outside the app #external\n"));

  const backlog = column(page, "Backlog");
  await expect(backlog.getByText("Added outside the app")).toBeVisible({ timeout: 10_000 });
  await expect(backlog.getByText("#external")).toBeVisible();
  // the app gave the plain card its own task file and link
  await expect.poll(() => exists("Tasks", "T009-added-outside-the-app.md")).toBe(true);
  expect(await readVaultFile("Kanban.md")).toContain("[[Tasks/T009-added-outside-the-app|Added outside the app]] #external");
});

test("does not answer requests addressed to another host", async ({ request }) => {
  const res = await request.get("/api/board", { headers: { Host: "evil.example" } });
  expect(res.status()).toBe(403);
});

const colors = async (page: Page) => {
  await page.locator('[aria-roledescription="sortable"]').first().waitFor();
  return page.evaluate(() => ({
    page: getComputedStyle(document.body).backgroundColor,
    card: getComputedStyle(document.querySelector('[aria-roledescription="sortable"]')!).backgroundColor,
    theme: document.documentElement.dataset.theme ?? "system",
  }));
};

const LIGHT = { page: "rgb(244, 246, 249)", card: "rgb(255, 255, 255)" };
const DARK = { page: "rgb(15, 22, 35)", card: "rgb(24, 34, 51)" };

test.describe("themes", () => {
  test("light by default, dark when the system prefers it", async ({ page }) => {
    expect(await colors(page)).toMatchObject({ ...LIGHT, theme: "system" });
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await colors(page)).toMatchObject({ ...DARK, theme: "system" });
  });

  test("the toggle overrides the system and the choice survives a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await page.getByRole("button", { name: /^Theme: System/ }).click();
    expect(await colors(page)).toMatchObject({ ...LIGHT, theme: "light" });

    await page.reload();
    await expect(page.getByRole("button", { name: /^Theme: Light/ })).toBeVisible();
    expect(await colors(page)).toMatchObject({ ...LIGHT, theme: "light" });

    await page.getByRole("button", { name: /^Theme: Light/ }).click();
    expect(await colors(page)).toMatchObject({ ...DARK, theme: "dark" });
    await page.reload();
    expect(await colors(page)).toMatchObject({ ...DARK, theme: "dark" });
  });

  test("a saved dark choice is applied before the page shows, so it does not flash", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // The inline script has already run: the attribute is there before React starts.
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  });
});

test.describe("keyboard", () => {
  test("N adds a card with the keyboard only, and the card survives a reload", async ({ page }) => {
    await page.keyboard.press("KeyN");
    await expect(column(page, "Backlog").getByLabel("Card title")).toBeFocused();
    await page.keyboard.type("Typed without a mouse");
    await page.keyboard.press("Enter");
    await expect(column(page, "Backlog").getByText("Typed without a mouse")).toBeVisible();
    await page.reload();
    await expect(column(page, "Backlog").getByText("Typed without a mouse")).toBeVisible();
    expect(await readVaultFile("Kanban.md")).toContain("Typed without a mouse");
  });

  test("a digit adds to that column and Escape closes the form", async ({ page }) => {
    await page.keyboard.press("Digit4");
    await expect(column(page, "Review").getByLabel("Card title")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Card title")).toHaveCount(0);
  });

  test("? lists the shortcuts and T changes the theme", async ({ page }) => {
    await page.keyboard.press("Shift+Slash");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.keyboard.press("KeyT");
    expect((await colors(page)).theme).toBe("light");
  });

  test("E edits the focused card", async ({ page }) => {
    await column(page, "Next").getByText("Design the card layout").locator("xpath=ancestor::*[@role='button'][1]").focus();
    await page.keyboard.press("KeyE");
    await expect(page.getByRole("dialog", { name: "Edit card" })).toBeVisible();
  });

  test("moves a card to the next column with Space and the arrow keys", async ({ page }) => {
    await column(page, "Backlog").getByText("Plan the weekly review").locator("xpath=ancestor::*[@role='button'][1]").focus();
    // dnd-kit announces each step in a hidden live region; wait for it so the keys are not pressed too fast.
    const announced = (text: string) => expect(page.getByText(text)).toBeAttached();
    await page.keyboard.press("Space");
    await announced("was moved over");
    await page.keyboard.press("ArrowRight");
    await announced("was moved over droppable area T003-design-the-card-layout");
    await page.keyboard.press("Space");
    await announced("was dropped");

    await expect(column(page, "Next").getByText("Plan the weekly review")).toBeVisible();
    await expect(column(page, "Backlog").getByText("Plan the weekly review")).toHaveCount(0);
    await page.reload();
    await expect(column(page, "Next").getByText("Plan the weekly review")).toBeVisible();
    const text = await readVaultFile("Kanban.md");
    expect(text.indexOf("T001")).toBeGreaterThan(text.indexOf("## Next"));
    expect(text.indexOf("T001")).toBeLessThan(text.indexOf("## In progress"));
  });
});
