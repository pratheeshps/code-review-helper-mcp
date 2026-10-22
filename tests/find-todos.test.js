
import { describe, it, expect } from "vitest";
import { findTodos } from "../src/tools/find-todos.js";

describe("findTodos", () => {
  it("finds TODO, FIXME, and HACK comments", () => {
    const code = [
      "// TODO: add validation",
      "// FIXME: handle errors",
      "/* HACK: temporary workaround */",
    ].join("\n");

    const result = findTodos(code);

    expect(result.findingCount).toBe(3);
    expect(result.findings.map((item) => item.tag)).toEqual([
      "TODO",
      "FIXME",
      "HACK",
    ]);
  });

  it("returns correct line numbers", () => {
    const code = [
      "const count = 1;",
      "",
      "// TODO: improve naming",
    ].join("\n");

    const result = findTodos(code);

    expect(result.findings[0].line).toBe(3);
  });

  it("returns no findings when no markers exist", () => {
    const result = findTodos("const total = 10;");

    expect(result.findingCount).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it("handles empty input", () => {
    const result = findTodos("");

    expect(result.linesScanned).toBe(1);
    expect(result.findingCount).toBe(0);
  });

  it("supports lowercase markers", () => {
    const result = findTodos("// todo: add a test");

    expect(result.findings[0].tag).toBe("TODO");
  });
});
