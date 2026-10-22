import { describe, it, expect } from "vitest";
import { analyzeJavaScript } from "../src/tools/analyze-code.js";

describe("analyzeJavaScript", () => {
    it("returns no findings for clean code", () => {
        const result = analyzeJavaScript("const count = 10;");

        expect(result.findingCount).toBe(0);
        expect(result.findings).toEqual([]);
    });

    it("detects var usage", () => {
        const result = analyzeJavaScript("var count = 10;");

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].rule).toBe("prefer-const-let");
        expect(result.findings[0].line).toBe(1);
    });

    it("detects console.log", () => {
        const result = analyzeJavaScript("console.log('Hello');");

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].rule).toBe("no-console-log");
    });

    it("detects debugger statements", () => {
        const result = analyzeJavaScript("debugger;");

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].rule).toBe("no-debugger");
    });

    it("detects eval usage", () => {
        const result = analyzeJavaScript("eval('1 + 1');");

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].rule).toBe("no-eval");
    });

    it("reports the correct line number", () => {
        const code = "const a = 1;\nvar b = 2;";
        const result = analyzeJavaScript(code);

        expect(result.findings[0].line).toBe(2);
    });

    it("counts multiple findings on the same line", () => {
        const result = analyzeJavaScript("eval(\"console.log('test')\");");

        expect(result.findingCount).toBe(2);
    });

    it("handles an empty source string", () => {
        const result = analyzeJavaScript("");

        expect(result.findingCount).toBe(0);
        expect(result.findings).toEqual([]);
        expect(result.linesAnalyzed).toBe(1);
    });

    it("reports findings on separate lines correctly", () => {
        const code = [
            "const name = 'Alex';",
            "var age = 30;",
            "console.log(name);",
        ].join("\n");

        const result = analyzeJavaScript(code);

        expect(result.findingCount).toBe(2);
        expect(result.findings[0].line).toBe(2);
        expect(result.findings[1].line).toBe(3);
    });

    it("does not execute submitted source code", () => {
        const code = "eval('throw new Error(\"executed\")');";

        const result = analyzeJavaScript(code);

        expect(result.findingCount).toBe(1);
        expect(result.findings[0].rule).toBe("no-eval");
    });
});
