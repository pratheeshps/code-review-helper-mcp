import { analyzeJavaScript } from "./analyze-code.js";
import { findTodos } from "./find-todos.js";
import { checkNamingConventions } from "./check-naming.js";

function runCheck(name, callback) {
    try {
        const result = callback();

        return {
            name,
            result,
            status: result?.error ? "failed" : "passed",
            error: result?.error ?? null,
        };
    } catch (error) {
        return {
            name,
            result: null,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function recommendationFor(finding) {
    if (finding.category === "todo-comment") {
        return "Resolve this task or document why it should remain open.";
    }

    if (finding.category === "naming-convention") {
        return finding.type === "class"
            ? "Rename the class using PascalCase."
            : "Rename the identifier using camelCase.";
    }

    const recommendations = {
        "no-unused-vars":
            "Remove the unused declaration or use it where intended.",
        "no-undef": "Define or import this identifier before using it.",
        "no-var": "Replace var with const or let.",
        "no-console":
            "Use your application's logging strategy where appropriate.",
        "no-debugger": "Remove the debugger statement before shipping.",
        "no-eval": "Avoid eval; use a safer alternative.",
        eqeqeq: "Use strict equality (=== or !==) where appropriate.",
    };

    return (
        recommendations[finding.rule] ??
        "Review this finding and update the code as appropriate."
    );
}

function normalizeFinding(finding, category) {
    const rawSeverity = String(finding.severity ?? "").toLowerCase();

    let severity;

    if (category === "todo-comment") {
        severity = "info";
    } else if (rawSeverity === "error") {
        severity = "error";
    } else if (rawSeverity === "warning" || category === "naming-convention") {
        severity = "warning";
    } else {
        severity = "info";
    }

    const rule = finding.rule ?? category;
    const line = finding.line ?? null;
    const identity = finding.name ?? finding.tag ?? finding.column ?? "";

    return {
        ...finding,
        id: `${category}:${rule}:${line ?? "unknown"}:${identity}`,
        category,
        severity,
        recommendation: recommendationFor({ ...finding, category }),
    };
}

export function reviewCode(code) {
    const checks = [
        runCheck("staticAnalysis", () => analyzeJavaScript(code)),
        runCheck("todoComments", () => findTodos(code)),
        runCheck("namingConventions", () => checkNamingConventions(code)),
    ];

    const findings = [];

    const categoryByCheck = {
        staticAnalysis: "static-analysis",
        todoComments: "todo-comment",
        namingConventions: "naming-convention",
    };

    for (const check of checks) {
        const sourceFindings = check.result?.findings ?? [];
        const category = categoryByCheck[check.name];

        for (const finding of sourceFindings) {
            findings.push(normalizeFinding(finding, category));
        }
    }

    const summary = {
        totalFindings: findings.length,
        error: findings.filter((item) => item.severity === "error").length,
        warning: findings.filter((item) => item.severity === "warning").length,
        info: findings.filter((item) => item.severity === "info").length,
        failedChecks: checks.filter((check) => check.status === "failed")
            .length,
    };

    return {
        language: "javascript",
        linesReviewed: code.split(/\r?\n/).length,
        summary,
        checks: Object.fromEntries(
            checks.map((check) => {
                const sourceFindings = check.result?.findings ?? [];

                return [
                    check.name,
                    {
                        status: check.status,
                        findingCount: sourceFindings.length,
                        error: check.error,
                    },
                ];
            }),
        ),
        findings,
    };
}
