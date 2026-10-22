
import { Linter } from "eslint";

const linter = new Linter();

const reviewConfig = [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-var": "warn",
      "no-console": "warn",
      "no-debugger": "error",
      "no-eval": "error",
      "eqeqeq": "warn",
    },
  },
];

export function analyzeJavaScript(code) {
  const messages = linter.verify(code, reviewConfig, {
    filename: "snippet.js",
  });

  const findings = messages.map((message) => ({
    line: message.line ?? 1,
    column: message.column ?? 1,
    severity: message.severity === 2 ? "error" : "warning",
    rule: message.ruleId ?? "parse-error",
    message: message.message,
    code: code.split(/\r?\n/)[(message.line ?? 1) - 1]?.trim() ?? "",
  }));

  return {
    language: "javascript",
    linesAnalyzed: code.split(/\r?\n/).length,
    findingCount: findings.length,
    errorCount: findings.filter((item) => item.severity === "error").length,
    warningCount: findings.filter((item) => item.severity === "warning").length,
    findings,
    note: "Analysis uses ESLint rules. Review findings before treating them as confirmed bugs.",
  };
}
