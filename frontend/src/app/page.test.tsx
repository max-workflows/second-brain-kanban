import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeApi } from "@/test/fakeApi";
import Home from "./page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home page", () => {
  it("shows the page title and the board", async () => {
    installFakeApi();
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Kanban" })).toBeInTheDocument();
    expect(await screen.findAllByRole("heading", { level: 2 })).toHaveLength(5);
  });
});
