import { describe, expect, it } from "vitest";
import { isTypingTarget, shortcutOf } from "./dom";

describe("isTypingTarget", () => {
  it("is true for text fields and editable elements", () => {
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
    expect(isTypingTarget(document.createElement("select"))).toBe(true);
    const editable = document.createElement("div");
    Object.defineProperty(editable, "isContentEditable", { value: true });
    expect(isTypingTarget(editable)).toBe(true);
  });
  it("is false for everything else", () => {
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
  });
});

describe("shortcutOf", () => {
  it("uses the physical key, so other keyboard layouts work", () => {
    expect(shortcutOf({ code: "KeyN", key: "т", shiftKey: false })).toBe("n"); // Ukrainian layout
    expect(shortcutOf({ code: "KeyT", key: "е", shiftKey: false })).toBe("t");
    expect(shortcutOf({ code: "Digit3", key: "3", shiftKey: false })).toBe("3");
  });
  it("recognises the question mark on its own and on the physical slash key", () => {
    expect(shortcutOf({ code: "Slash", key: "?", shiftKey: true })).toBe("?");
    expect(shortcutOf({ code: "Slash", key: ",", shiftKey: true })).toBe("?"); // Ukrainian layout
  });
  it("ignores shifted letters and other keys", () => {
    expect(shortcutOf({ code: "KeyN", key: "N", shiftKey: true })).toBeNull();
    expect(shortcutOf({ code: "Digit0", key: "0", shiftKey: false })).toBeNull();
    expect(shortcutOf({ code: "Enter", key: "Enter", shiftKey: false })).toBeNull();
    expect(shortcutOf({ code: "Slash", key: "/", shiftKey: false })).toBeNull();
  });
});
