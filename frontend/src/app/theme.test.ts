// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "globals.css"), "utf8");

/** Reads `--name: value;` pairs from the first `{ ... }` that follows `selector`. */
function vars(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const out: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const light = vars(":root {");
const darkSystem = vars(':root:not([data-theme="light"])');
const darkChosen = vars(':root[data-theme="dark"]');

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};
const blend = (fg: Rgb, bg: Rgb, alpha: number): Rgb => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as Rgb;
const luminance = ([r, g, b]: Rgb) => {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Brand colors from the project spec, the same in both themes.
const BRAND = { accent: rgb("#ecad0a"), primary: rgb("#209dd7"), secondary: rgb("#753991") };
const WHITE: Rgb = [255, 255, 255];

describe("the two dark blocks", () => {
  it("define the same colors (system preference and explicit choice)", () => {
    expect(darkSystem).toEqual(darkChosen);
    expect(Object.keys(darkChosen).sort()).toEqual(Object.keys(light).sort());
  });
});

describe.each([
  ["light", light],
  ["dark", darkChosen],
] as const)("%s theme contrast", (name, t) => {
  const background = rgb(t.background);
  const surface = rgb(t.surface);
  const ink = rgb(t.ink);
  const column = blend(ink, background, 0.045); // the column background is a faint tint of the text color
  const chip = (color: Rgb, alpha: number) => blend(color, surface, alpha);

  it("body text is easy to read (AAA)", () => {
    expect(contrast(ink, background)).toBeGreaterThanOrEqual(7);
    expect(contrast(ink, surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(ink, column)).toBeGreaterThanOrEqual(7);
  });

  it("supporting text is readable", () => {
    // The light gray (#888888) is the color given in the project spec; it is below AA (4.5) for small text.
    const min = name === "light" ? 3 : 4.5;
    expect(contrast(rgb(t.muted), surface)).toBeGreaterThanOrEqual(min);
    expect(contrast(rgb(t.muted), column)).toBeGreaterThanOrEqual(min);
  });

  it("tag labels are readable on their tinted chips (AA)", () => {
    expect(contrast(rgb(t["primary-fg"]), chip(BRAND.primary, 0.1))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(t["secondary-fg"]), chip(BRAND.secondary, 0.1))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(t["accent-fg"]), chip(BRAND.accent, 0.2))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink, chip(ink, 0.1))).toBeGreaterThanOrEqual(4.5);
  });

  it("error text is readable on the error background (AA)", () => {
    expect(contrast(rgb(t.danger), rgb(t["danger-bg"]))).toBeGreaterThanOrEqual(4.5);
  });

  it("the purple button keeps white text (AA)", () => {
    expect(contrast(WHITE, BRAND.secondary)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("dark theme links", () => {
  it("the blue link color is readable on cards and columns", () => {
    const surface = rgb(darkChosen.surface);
    const column = blend(rgb(darkChosen.ink), rgb(darkChosen.background), 0.045);
    expect(contrast(BRAND.primary, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(BRAND.primary, column)).toBeGreaterThanOrEqual(4.5);
  });
});
