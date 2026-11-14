import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeApi } from "@/test/fakeApi";
import { sampleBoard } from "@/test/fixtures";
import { updateCard } from "@/lib/board";
import { Board } from "./Board";

afterEach(() => {
  vi.unstubAllGlobals();
});

const column = (name: string) => screen.getByRole("region", { name });
const loaded = async () => {
  render(<Board pollMs={40} />);
  await screen.findByRole("heading", { level: 2, name: "Backlog" });
};

describe("loading", () => {
  it("shows five columns with their cards, tags and counts", async () => {
    installFakeApi();
    await loaded();
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Backlog", "Next", "In progress", "Review", "Done"]);
    const backlog = within(column("Backlog"));
    expect(backlog.getByText("Plan the weekly review")).toBeInTheDocument();
    expect(backlog.getByText("#planning")).toBeInTheDocument();
    expect(backlog.getByLabelText("2 cards")).toBeInTheDocument();
    expect(screen.getByText("Test vault")).toBeInTheDocument();
  });

  it("shows the problem and lets the person try again", async () => {
    const api = installFakeApi();
    api.failBoardLoad();
    render(<Board pollMs={40} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The vault is unreachable.");
    api.failBoardLoad(false);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Backlog" })).toBeInTheDocument();
  });
});

describe("changing cards", () => {
  it("adds a card with details and tags and sends it to the server", async () => {
    const api = installFakeApi();
    const user = userEvent.setup();
    await loaded();
    const review = column("Review");
    await user.click(within(review).getByRole("button", { name: "+ Add a card" }));
    await user.type(within(review).getByLabelText("Card title"), "Write release notes");
    await user.type(within(review).getByLabelText("Card details"), "Short and clear.");
    await user.type(within(review).getByLabelText("Card tags"), "#Docs, ops");
    await user.click(within(review).getByRole("button", { name: "Add card" }));

    expect(await within(review).findByText("Write release notes")).toBeInTheDocument();
    expect(within(review).getByText("#docs")).toBeInTheDocument();
    expect(within(review).getByLabelText("2 cards")).toBeInTheDocument();
    await waitFor(() =>
      expect(api.ops).toContainEqual({ type: "addCard", columnId: "col-3", title: "Write release notes", details: "Short and clear.", tags: ["docs", "ops"] }),
    );
  });

  it("does not add a card without a title", async () => {
    const api = installFakeApi();
    const user = userEvent.setup();
    await loaded();
    const review = column("Review");
    await user.click(within(review).getByRole("button", { name: "+ Add a card" }));
    await user.click(within(review).getByRole("button", { name: "Add card" }));
    expect(within(review).getByLabelText("1 cards")).toBeInTheDocument();
    expect(api.ops).toHaveLength(0);
  });

  it("edits title, details and tags in a dialog", async () => {
    const api = installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.click(within(column("Next")).getByText("Design the card layout"));
    const dialog = await screen.findByRole("dialog", { name: "Edit card" });
    const title = within(dialog).getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Design the card");
    await user.clear(within(dialog).getByLabelText("Details"));
    await user.type(within(dialog).getByLabelText("Details"), "New details");
    await user.clear(within(dialog).getByLabelText("Tags"));
    await user.type(within(dialog).getByLabelText("Tags"), "#ux #design");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await within(column("Next")).findByText("Design the card")).toBeInTheDocument();
    expect(within(column("Next")).getByText("#ux")).toBeInTheDocument();
    await waitFor(() =>
      expect(api.ops).toContainEqual({ type: "updateCard", id: "c3", title: "Design the card", details: "New details", tags: ["ux", "design"] }),
    );
  });

  it("opens the editor from the card menu and closes it with Escape", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Card options for Design the card layout" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit card" }));
    expect(await screen.findByRole("dialog", { name: "Edit card" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes a card from its menu", async () => {
    const api = installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Card options for Design the card layout" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete card" }));
    expect(screen.queryByText("Design the card layout")).not.toBeInTheDocument();
    expect(within(column("Next")).getByLabelText("1 cards")).toBeInTheDocument();
    await waitFor(() => expect(api.ops).toContainEqual({ type: "deleteCard", id: "c3" }));
  });
});

describe("renaming a column", () => {
  it("renames it", async () => {
    const api = installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Column options for Backlog" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename column" }));
    const input = screen.getByLabelText("Rename column Backlog");
    await user.clear(input);
    await user.type(input, "Ideas{Enter}");
    expect(screen.getByRole("heading", { level: 2, name: "Ideas" })).toBeInTheDocument();
    await waitFor(() => expect(api.ops).toContainEqual({ type: "renameColumn", columnId: "col-0", title: "Ideas" }));
  });

  it("keeps the old name when the new one is empty", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Column options for Done" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename column" }));
    const input = screen.getByLabelText("Rename column Done");
    await user.clear(input);
    await user.type(input, "{Enter}");
    expect(await screen.findByRole("heading", { level: 2, name: "Done" })).toBeInTheDocument();
  });
});

describe("keeping in step with the files", () => {
  it("shows a change made outside the app without a reload", async () => {
    const api = installFakeApi();
    await loaded();
    expect(screen.queryByText("Edited in Obsidian")).not.toBeInTheDocument();
    api.changeExternally(updateCard(sampleBoard(), "c1", { title: "Edited in Obsidian" }));
    expect(await screen.findByText("Edited in Obsidian")).toBeInTheDocument();
  });

  it("shows an error and goes back to the files when saving fails", async () => {
    const api = installFakeApi();
    const user = userEvent.setup();
    await loaded();
    api.failNextOp();
    await user.click(screen.getByRole("button", { name: "Card options for Design the card layout" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete card" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the change.");
    expect(await screen.findByText("Design the card layout")).toBeInTheDocument();
  });
});

describe("keyboard shortcuts", () => {
  const addForm = (name: string) => within(column(name)).queryByLabelText("Card title");

  it("N opens the add form in the first column, a digit in that column", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.keyboard("n");
    expect(addForm("Backlog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(addForm("Backlog")).not.toBeInTheDocument();
    await user.keyboard("3");
    expect(addForm("In progress")).toBeInTheDocument();
    expect(addForm("Backlog")).not.toBeInTheDocument();
  });

  it("does not react while typing in a field", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.keyboard("n");
    await user.type(within(column("Backlog")).getByLabelText("Card title"), "an n and a 3 and a ?");
    expect(within(column("Backlog")).getByLabelText("Card title")).toHaveValue("an n and a 3 and a ?");
    expect(addForm("In progress")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("works on a Ukrainian keyboard layout, where the N key types a different letter", async () => {
    installFakeApi();
    await loaded();
    fireEvent.keyDown(window, { code: "KeyN", key: "т" });
    expect(addForm("Backlog")).toBeInTheDocument();
  });

  it("ignores combinations with Ctrl, Alt or Meta", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.keyboard("{Control>}n{/Control}");
    expect(addForm("Backlog")).not.toBeInTheDocument();
  });

  it("a digit without a matching column does nothing", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.keyboard("9");
    expect(screen.queryByLabelText("Card title")).not.toBeInTheDocument();
  });

  it("? shows the list of shortcuts and Escape closes it", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.keyboard("?");
    const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(dialog).getByText("New card in the first column")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("the Shortcuts button opens the same list", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole("button", { name: /Shortcuts/ }));
    expect(await screen.findByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
  });

  it("T changes the theme", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.keyboard("t");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Theme: Light. Switch to Dark" })).toBeInTheDocument();
    await user.keyboard("t");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("E edits the card that has focus", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    const card = within(column("Next")).getByText("Design the card layout").closest<HTMLElement>('[role="button"]')!;
    card.focus();
    await user.keyboard("e");
    expect(await screen.findByRole("dialog", { name: "Edit card" })).toBeInTheDocument();
  });

  it("stays quiet while a card is being edited", async () => {
    installFakeApi();
    const user = userEvent.setup();
    await loaded();
    await user.click(within(column("Next")).getByText("Design the card layout"));
    await screen.findByRole("dialog", { name: "Edit card" });
    (document.activeElement as HTMLElement).blur();
    await user.keyboard("n");
    expect(addForm("Backlog")).not.toBeInTheDocument();
  });
});
