import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("shows the page title and the board", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Kanban" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });
});
