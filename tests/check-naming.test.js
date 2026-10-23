import { describe, it, expect } from "vitest";
import { checkNamingConventions } from "../src/tools/check-naming.js";

describe("checkNamingConventions", () => {
    it("accepts valid camelCase variables and functions", () => {
        const code = `
const userName = "Alex";
function calculateTotal() {
  return 100;
}
`;

        const result = checkNamingConventions(code);

        expect(result.findingCount).toBe(0);
    });

    it("flags underscore-separated variable names", () => {
        const result = checkNamingConventions("const user_name = 'Alex';");

        expect(result.findings[0].name).toBe("user_name");
        expect(result.findings[0].type).toBe("variable");
        expect(result.findings[0].rule).toBe("prefer-camel-case");
    });

    it("flags non-camelCase function names", () => {
        const result = checkNamingConventions("function Calculate_Total() {}");

        expect(result.findings[0].name).toBe("Calculate_Total");
        expect(result.findings[0].type).toBe("function");
    });

    it("flags non-PascalCase class names", () => {
        const result = checkNamingConventions("class user_service {}");

        expect(result.findings[0].name).toBe("user_service");
        expect(result.findings[0].type).toBe("class");
        expect(result.findings[0].rule).toBe("prefer-pascal-case");
    });

    it("reports the correct line number", () => {
        const code = [
            "const userName = 'Alex';",
            "const invalid_name = 'Sam';",
        ].join("\n");

        const result = checkNamingConventions(code);

        expect(result.findings[0].line).toBe(2);
    });

    it("returns no findings for empty input", () => {
        const result = checkNamingConventions("");

        expect(result.findingCount).toBe(0);
        expect(result.findings).toEqual([]);
    });

    it("ignores variable-like text inside strings and comments", () => {
        const code = `
const message = "const user_name = 'not a declaration'";
 // const bad_name = "comment only";
const goodName = "Alex";
`;

        const result = checkNamingConventions(code);

        expect(result.findings).toHaveLength(0);
    });

    it("detects names in multiline declarations", () => {
        const code = `
const
  user_name = "Alex";
`;

        const result = checkNamingConventions(code);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0]).toMatchObject({
            name: "user_name",
            type: "variable",
            line: 3,
        });
    });

    it("checks destructured variable names", () => {
        const code = `
const { user_name } = user;
const [first_name] = names;
`;

        const result = checkNamingConventions(code);

        expect(result.findings.map((finding) => finding.name)).toEqual([
            "user_name",
            "first_name",
        ]);
    });

    it("returns an error for invalid JavaScript", () => {
        const result = checkNamingConventions("const = ;");

        expect(result.findingCount).toBe(0);
        expect(result.error).toContain("Unable to parse JavaScript:");
    });

    it("accepts module-level CONSTANT_CASE declarations", () => {
        const code = `
const TODO_PATTERN = /TODO/;
const MAX_RETRIES = 3;
const user_name = "Alex";
`;

        const result = checkNamingConventions(code);

        expect(
            result.findings.some((finding) => finding.name === "TODO_PATTERN"),
        ).toBe(false);

        expect(
            result.findings.some((finding) => finding.name === "MAX_RETRIES"),
        ).toBe(false);

        expect(
            result.findings.some((finding) => finding.name === "user_name"),
        ).toBe(true);
    });
});
