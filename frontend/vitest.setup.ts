import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest has no globals by default, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
  // Browser-like tests only (server tests run without a document): start every test with the theme on "system".
  if (typeof document !== "undefined") {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  }
});
