import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

// Smoke test: proves the test tooling works. Replaced by real board tests in the next step.
describe("Home page", () => {
  it("renders a heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
