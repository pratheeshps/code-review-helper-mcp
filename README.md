
# Code Review Helper MCP

A lightweight Model Context Protocol (MCP) server that exposes
JavaScript code-quality analysis tools to MCP-compatible AI assistants.

The project integrates ESLint's programmatic API to identify common
JavaScript issues and returns structured findings through MCP.

## Features

- MCP server built with Node.js and JavaScript.
- `hello_mcp` tool to verify server connectivity.
- `analyze_code` tool to inspect JavaScript source snippets.
- ESLint-powered findings for undefined variables, unused variables,
  `var` usage, console statements, debugger statements, `eval()`,
  and loose equality.
- Structured results with severity, rule ID, line, column, and message.
- Input validation using Zod.
- Automated tests using Vitest.
- Source snippets are analyzed without executing them.

## Architecture

An MCP-compatible client communicates with the server using the
Model Context Protocol over standard input/output (stdio).

The server validates tool inputs, passes JavaScript source to the
ESLint-based analyzer, and returns structured findings to the client.

## Tech Stack

- JavaScript (ES modules)
- Node.js
- Model Context Protocol SDK
- ESLint
- Zod
- Vitest

## Prerequisites

- A supported Node.js LTS release
- npm
- An MCP-compatible client or MCP Inspector

## Installation

Clone the repository:

```bash
git clone [<YOUR_GITHUB_REPOSITORY_URL>](https://github.com/pratheeshps/code-review-helper-mcp)
cd code-review-helper-mcp
npm install
```

## Run Tests

```bash
npm test
```

## Run ESLint on the Project

```bash
npx eslint src tests
```

## Start with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node src/index.js
```

Open the local Inspector URL printed in the terminal, connect to
the server, and select **Tools → List Tools**.

Available tools:

### `hello_mcp`

Checks that the server responds to MCP tool calls.

Input:

```json
{
  "name": "Developer"
}
```

### `analyze_code`

Analyzes a JavaScript source snippet and returns structured findings.

Input:

```json
{
  "code": "var total = missingValue; console.log(total);"
}
```

Example response shape:

```json
{
  "language": "javascript",
  "linesAnalyzed": 1,
  "findingCount": 3,
  "errorCount": 1,
  "warningCount": 2,
  "findings": [
    {
      "line": 1,
      "column": 1,
      "severity": "warning",
      "rule": "no-var",
      "message": "Unexpected var, use let or const instead.",
      "code": "var total = missingValue; console.log(total);"
    }
  ],
  "note": "Analysis uses ESLint rules. Review findings before treating them as confirmed bugs."
}
```

The example response is illustrative; exact findings and counts depend
on the configured ESLint rules and source code.

## Design Decisions

- Uses ESLint rather than relying solely on regular expressions.
- Separates analysis logic from MCP protocol integration.
- Uses a fixed rule configuration for predictable analysis.
- Validates source input and limits its size.
- Avoids executing submitted JavaScript.

## Limitations

- Analysis is based on configured ESLint rules, not a complete security audit.
- Source snippets are analyzed in isolation.
- Findings may require developer judgment.
- The current implementation focuses on JavaScript snippets, not
  complete multi-file projects.
- The server currently uses local stdio transport.

## Security Notes

Treat source code supplied to the tool as untrusted input.
Do not send confidential source code to external services without
authorization. This implementation analyzes snippets without executing
them, but that alone does not guarantee complete security.

## Roadmap

- Add `find_todos` to extract TODO and FIXME comments.
- Add `check_naming_conventions`.
- Add `summarize_file`.
- Add safe local-file analysis with explicit directory restrictions.
- Expand test coverage and add CI with GitHub Actions.
- Explore optional AI-generated review explanations.

## License

MIT — see the LICENSE file.
