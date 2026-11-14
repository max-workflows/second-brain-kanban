import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

const root = () => document.documentElement;

describe("ThemeToggle", () => {
  it("starts by following the system", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeInTheDocument();
    expect(root().dataset.theme).toBeUndefined();
  });

  it("cycles system, light, dark, system and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button"));
    expect(root().dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Theme: Light. Switch to Dark" })).toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(root().dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(screen.getByRole("button"));
    expect(root().dataset.theme).toBeUndefined();
    expect(localStorage.getItem("theme")).toBeNull();
    expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeInTheDocument();
  });

  it("shows a saved choice when the page opens", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Theme: Dark. Switch to System" })).toBeInTheDocument();
  });

  it("keeps every toggle on the page in step", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    await user.click(screen.getAllByRole("button")[0]);
    expect(screen.getAllByRole("button", { name: "Theme: Light. Switch to Dark" })).toHaveLength(2);
  });
});
