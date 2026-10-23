
import { parse } from "acorn";

const TODO_PATTERN = /^\s*\*?\s*(TODO|FIXME|HACK)\b\s*:?\s*(.*)$/i;

export function findTodos(code) {
  const lines = code.split(/\r?\n/);
  const comments = [];

  try {
    parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      onComment: comments,
    });
  } catch (error) {
    return {
      language: "javascript",
      linesScanned: lines.length,
      findingCount: 0,
      findings: [],
      error: `Unable to parse JavaScript: ${error.message}`,
    };
  }

  const findings = [];

  for (const comment of comments) {
    const commentLines = comment.value.split(/\r?\n/);

    commentLines.forEach((commentLine, offset) => {
      const match = commentLine.match(TODO_PATTERN);

      if (!match) return;

      const lineNumber = comment.loc.start.line + offset;

      findings.push({
        line: lineNumber,
        tag: match[1].toUpperCase(),
        message: match[2].trim(),
        code: lines[lineNumber - 1].trim(),
      });
    });
  }

  return {
    language: "javascript",
    linesScanned: lines.length,
    findingCount: findings.length,
    findings,
  };
}
