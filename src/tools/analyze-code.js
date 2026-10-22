
export function analyzeJavaScript(code) {
  const findings = [];
  const lines = code.split(/\r?\n/);

  const rules = [
    {
      pattern: /\bvar\s+/,
      severity: "warning",
      message: "Consider using const or let instead of var.",
      rule: "prefer-const-let",
    },
    {
      pattern: /\bconsole\.log\s*\(/,
      severity: "info",
      message: "Check whether this debug log should remain in production.",
      rule: "no-console-log",
    },
    {
      pattern: /\bdebugger\s*;?/,
      severity: "warning",
      message: "Remove debugger statements before production.",
      rule: "no-debugger",
    },
    {
      pattern: /\beval\s*\(/,
      severity: "warning",
      message: "Avoid eval() when possible; it can execute unsafe code.",
      rule: "no-eval",
    },
  ];

  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        findings.push({
          line: index + 1,
          severity: rule.severity,
          rule: rule.rule,
          message: rule.message,
          code: line.trim(),
        });
      }
    }
  });

  return {
    language: "javascript",
    linesAnalyzed: lines.length,
    findingCount: findings.length,
    findings,
    note:
      "These are heuristic checks, not a full parser. " +
      "Matches in comments or strings may produce false positives.",
  };
}
