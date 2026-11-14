import { describe, expect, it } from "vitest";
import { cleanTitle, firstParagraph, normalizeTags, parseTagInput, slugify } from "./text";

describe("firstParagraph", () => {
  it("returns only the first paragraph on one line", () => {
    expect(firstParagraph("Line one\nline two\n\nSecond paragraph\n- a\n- b")).toBe("Line one line two");
  });
  it("copes with empty details", () => {
    expect(firstParagraph("")).toBe("");
    expect(firstParagraph("  \n ")).toBe("");
  });
});

describe("cleanTitle", () => {
  it("makes a single safe line", () => {
    expect(cleanTitle("  Line one\n line   two [x] | y ")).toBe("Line one line two (x) / y");
  });
  it("limits the length", () => {
    expect(cleanTitle("a".repeat(500))).toHaveLength(200);
  });
});

describe("normalizeTags", () => {
  it("lowercases, strips #, removes duplicates and digit-only tags", () => {
    expect(normalizeTags(["#Docs", "docs", " Big Idea ", "2026", "ok_tag"])).toEqual(["docs", "big-idea", "ok_tag"]);
  });
  it("keeps non-latin letters", () => {
    expect(normalizeTags(["Планування"])).toEqual(["планування"]);
  });
  it("keeps at most ten", () => {
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(10);
  });
});

describe("parseTagInput", () => {
  it("splits on commas and spaces", () => {
    expect(parseTagInput("a, #b  c,,")).toEqual(["a", "b", "c"]);
  });
});

describe("slugify", () => {
  it("makes a file-safe slug", () => {
    expect(slugify("Write the Release Notes!")).toBe("write-the-release-notes");
  });
  it("keeps letters of other alphabets", () => {
    expect(slugify("Зібрати вакансії")).toBe("зібрати-вакансії");
  });
  it("falls back when nothing is left", () => {
    expect(slugify("???")).toBe("card");
  });
  it("is limited in length without a trailing dash", () => {
    const slug = slugify("word ".repeat(30), 12);
    expect(slug.length).toBeLessThanOrEqual(12);
    expect(slug.endsWith("-")).toBe(false);
  });
});
