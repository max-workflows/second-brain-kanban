import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Board } from "./Board";

const column = (name: string) => screen.getByRole("region", { name });

describe("Board", () => {
  it("shows five columns with their cards and counts", () => {
    render(<Board />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Backlog", "Next", "In progress", "Review", "Done"]);
    expect(within(column("Backlog")).getByText("Plan the weekly review")).toBeInTheDocument();
    expect(within(column("Backlog")).getByLabelText("2 cards")).toBeInTheDocument();
  });

  it("adds a card to a column", async () => {
    const user = userEvent.setup();
    render(<Board />);
    const review = column("Review");
    await user.click(within(review).getByRole("button", { name: "+ Add a card" }));
    await user.type(within(review).getByLabelText("Card title"), "Write release notes");
    await user.type(within(review).getByLabelText("Card details"), "Short and clear.");
    await user.click(within(review).getByRole("button", { name: "Add card" }));

    expect(within(review).getByText("Write release notes")).toBeInTheDocument();
    expect(within(review).getByText("Short and clear.")).toBeInTheDocument();
    expect(within(review).getByLabelText("2 cards")).toBeInTheDocument();
  });

  it("does not add a card without a title", async () => {
    const user = userEvent.setup();
    render(<Board />);
    const review = column("Review");
    await user.click(within(review).getByRole("button", { name: "+ Add a card" }));
    await user.click(within(review).getByRole("button", { name: "Add card" }));
    expect(within(review).getByLabelText("1 cards")).toBeInTheDocument();
  });

  it("deletes a card from its menu", async () => {
    const user = userEvent.setup();
    render(<Board />);
    await user.click(screen.getByRole("button", { name: "Card options for Design the card layout" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete card" }));
    expect(screen.queryByText("Design the card layout")).not.toBeInTheDocument();
    expect(within(column("Next")).getByLabelText("1 cards")).toBeInTheDocument();
  });

  it("renames a column", async () => {
    const user = userEvent.setup();
    render(<Board />);
    await user.click(screen.getByRole("button", { name: "Column options for Backlog" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename column" }));
    const input = screen.getByLabelText("Rename column Backlog");
    await user.clear(input);
    await user.type(input, "Ideas{Enter}");
    expect(screen.getByRole("heading", { level: 2, name: "Ideas" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Backlog" })).not.toBeInTheDocument();
  });

  it("keeps the old name when the new one is empty", async () => {
    const user = userEvent.setup();
    render(<Board />);
    await user.click(screen.getByRole("button", { name: "Column options for Done" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename column" }));
    const input = screen.getByLabelText("Rename column Done");
    await user.clear(input);
    await user.type(input, "{Enter}");
    expect(screen.getByRole("heading", { level: 2, name: "Done" })).toBeInTheDocument();
  });
});
