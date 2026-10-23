import { describe, expect, it } from "vitest";
import { reviewCode } from "../src/tools/review-code.js";

describe("reviewCode", () => {
    it("combines static analysis, TODO, and naming findings", () => {
        const code = `
const user_name = "Alex";
// TODO: Validate input
function Calculate_Total() {
  var total = 10;
  console.log(total);
  return total == null ? 0 : total;
}
`;

        const result = reviewCode(code);

        expect(result.language).toBe("javascript");
        expect(result.summary.totalFindings).toBeGreaterThan(0);

        expect(
            result.findings.some(
                (finding) => finding.category === "static-analysis",
            ),
        ).toBe(true);

        expect(
            result.findings.some(
                (finding) => finding.category === "todo-comment",
            ),
        ).toBe(true);

        expect(
            result.findings.some(
                (finding) => finding.category === "naming-convention",
            ),
        ).toBe(true);
    });

    it("keeps summary counts consistent with findings", () => {
        const code = `
const user_name = "Alex";
// TODO: Validate input
function Calculate_Total() {
  var total = 10;
  console.log(total);
  return total == null ? 0 : total;
}
`;

        const result = reviewCode(code);
        const { findings, summary } = result;

        expect(summary.totalFindings).toBe(findings.length);
        expect(summary.error).toBe(
            findings.filter((item) => item.severity === "error").length,
        );
        expect(summary.warning).toBe(
            findings.filter((item) => item.severity === "warning").length,
        );
        expect(summary.info).toBe(
            findings.filter((item) => item.severity === "info").length,
        );

        expect(
            findings.every((item) => typeof item.recommendation === "string"),
        ).toBe(true);

        expect(findings.every((item) => typeof item.id === "string")).toBe(
            true,
        );
    });

    it("reports a failed check for invalid JavaScript", () => {
        const result = reviewCode("const = ;");

        expect(result.summary.failedChecks).toBeGreaterThan(0);

        expect(
            Object.values(result.checks).some(
                (check) => check.status === "failed" && check.error,
            ),
        ).toBe(true);
    });
});
