
import { describe, expect, it } from "vitest";
import { getChangedLines } from "../src/tools/changed-lines.js";

describe("getChangedLines", () => {
  it("returns added line numbers from a diff", () => {
    const patch = [
      "@@ -1,3 +1,4 @@",
      " const first = 1;",
      "+const second = 2;",
      " const third = 3;",
      " const fourth = 4;",
    ].join("\n");

    expect(getChangedLines(patch)).toEqual([2]);
  });

  it("handles multiple diff hunks", () => {
    const patch = [
      "@@ -1,2 +1,3 @@",
      " const first = 1;",
      "+const second = 2;",
      " const third = 3;",
      "@@ -10,2 +11,3 @@",
      " const tenth = 10;",
      "+const eleventh = 11;",
      " const twelfth = 12;",
    ].join("\n");

    expect(getChangedLines(patch)).toEqual([2, 12]);
  });

  it("handles replacements and ignores removed line numbers", () => {
    const patch = [
      "@@ -4,3 +4,3 @@",
      " const before = true;",
      "-const oldName = 1;",
      "+const newName = 1;",
      " const after = true;",
    ].join("\n");

    expect(getChangedLines(patch)).toEqual([5]);
  });

  it("returns an empty array for missing or invalid patches", () => {
    expect(getChangedLines(undefined)).toEqual([]);
    expect(getChangedLines(null)).toEqual([]);
    expect(getChangedLines("")).toEqual([]);
  });

  it("handles added files", () => {
    const patch = [
      "@@ -0,0 +1,3 @@",
      "+const first = 1;",
      "+const second = 2;",
      "+const third = 3;",
    ].join("\n");

    expect(getChangedLines(patch)).toEqual([1, 2, 3]);
  });
});
