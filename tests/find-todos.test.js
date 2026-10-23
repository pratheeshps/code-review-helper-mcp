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
        const code = ["const count = 1;", "", "// TODO: improve naming"].join(
            "\n",
        );

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

describe("findTodos parser-aware behavior", () => {
    it("ignores TODO-like text inside strings", () => {
        const code = `
const message = "// TODO: this is just a string";
const another = "/* FIXME: also just a string */";
// TODO: this is a real comment
`;

        const result = findTodos(code);

        expect(result.findingCount).toBe(1);
        expect(result.findings[0].tag).toBe("TODO");
        expect(result.findings[0].line).toBe(4);
    });

    it("detects tags inside multiline block comments", () => {
        const code = `
/*
 * TODO: handle empty input
 * FIXME: improve error handling
 */
function example() {}
`;

        const result = findTodos(code);

        expect(result.findingCount).toBe(2);
        expect(result.findings[0]).toMatchObject({
            line: 3,
            tag: "TODO",
            message: "handle empty input",
        });
        expect(result.findings[1]).toMatchObject({
            line: 4,
            tag: "FIXME",
            message: "improve error handling",
        });
    });

    it("returns an error for invalid JavaScript", () => {
        const result = findTodos("function { // TODO: broken");

        expect(result.findingCount).toBe(0);
        expect(result.error).toContain("Unable to parse JavaScript:");
    });
});
