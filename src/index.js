import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { analyzeJavaScript } from "./tools/analyze-code.js";
import { findTodos } from "./tools/find-todos.js";
import { checkNamingConventions } from "./tools/check-naming.js";
import { fetchGitHubFile } from "./tools/github-file.js";
import { reviewCode } from "./tools/review-code.js";
import { listGitHubFiles } from "./tools/list-github-files.js";

const server = new McpServer({
    name: "code-review-helper",
    version: "1.0.0",
});

// Tool 1: Verify that the MCP server is working
server.registerTool(
    "hello_mcp",
    {
        title: "Hello MCP",
        description: "Returns a greeting to verify that the MCP server works.",
        inputSchema: {
            name: z.string().min(1).default("Developer"),
        },
    },
    async ({ name }) => ({
        content: [
            {
                type: "text",
                text: `Hello, ${name}! Your Code Review Helper MCP server is working.`,
            },
        ],
    }),
);

// Tool 2: Analyze a JavaScript snippet

server.registerTool(
    "analyze_code",
    {
        title: "Analyze JavaScript Code",
        description:
            "Checks JavaScript source code for common potential issues, " +
            "including var usage, console.log, debugger, and eval.",
        inputSchema: {
            code: z
                .string()
                .min(1, "Code cannot be empty.")
                .max(20000, "Code must be 20,000 characters or fewer.")
                .refine((value) => value.trim().length > 0, {
                    message: "Code cannot contain only whitespace.",
                })
                .describe("The JavaScript source code to analyze."),
        },
    },
    async ({ code }) => {
        const report = analyzeJavaScript(code);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(report, null, 2),
                },
            ],
        };
    },
);

server.registerTool(
    "find_todos",
    {
        title: "Find TODO Comments",
        description:
            "Finds TODO, FIXME, and HACK markers in JavaScript source code.",
        inputSchema: {
            code: z
                .string()
                .min(1, "Code cannot be empty.")
                .max(20000, "Code must be 20,000 characters or fewer.")
                .refine((value) => value.trim().length > 0, {
                    message: "Code cannot contain only whitespace.",
                })
                .describe("JavaScript source code to scan."),
        },
    },
    async ({ code }) => {
        const report = findTodos(code);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(report, null, 2),
                },
            ],
        };
    },
);

server.registerTool(
    "check_naming_conventions",
    {
        title: "Check Naming Conventions",
        description:
            "Checks JavaScript variable, function, and class names against basic camelCase and PascalCase conventions.",
        inputSchema: {
            code: z
                .string()
                .min(1, "Code cannot be empty.")
                .max(20000, "Code must be 20,000 characters or fewer.")
                .refine((value) => value.trim().length > 0, {
                    message: "Code cannot contain only whitespace.",
                })
                .describe("JavaScript source code to inspect."),
        },
    },
    async ({ code }) => {
        const report = checkNamingConventions(code);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(report, null, 2),
                },
            ],
        };
    },
);

server.registerTool(
    "review_code",
    {
        title: "Review JavaScript Code",
        description:
            "Run static analysis, find TODO comments, and check naming conventions in JavaScript source code.",
        inputSchema: {
            code: z
                .string()
                .min(1)
                .max(20000)
                .refine(
                    (value) => value.trim().length > 0,
                    "Code must not be empty",
                ),
        },
    },
    async ({ code }) => ({
        content: [
            {
                type: "text",
                text: JSON.stringify(reviewCode(code), null, 2),
            },
        ],
    }),
);

server.registerTool(
    "review_github_file",
    {
        title: "Review GitHub JavaScript File",
        description:
            "Fetch a JavaScript file from a GitHub repository and review it for static analysis issues, TODO comments, and naming conventions.",
        inputSchema: {
            owner: z.string().min(1).max(100),
            repo: z.string().min(1).max(100),
            path: z.string().min(1).max(500),
            ref: z.string().min(1).max(200).optional(),
        },
    },
    async ({ owner, repo, path, ref }) => {
        try {
            if (!/\.(js|mjs|cjs)$/i.test(path)) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Only .js, .mjs, and .cjs files are supported.",
                        },
                    ],
                };
            }

            const file = await fetchGitHubFile({
                owner,
                repo,
                path,
                ref,
            });

            const report = reviewCode(file.code);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(
                            {
                                source: {
                                    owner: file.owner,
                                    repo: file.repo,
                                    path: file.path,
                                    ref: file.ref,
                                    sha: file.sha,
                                    size: file.size,
                                },
                                report,
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        } catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `GitHub file review failed: ${
                            error instanceof Error
                                ? error.message
                                : "Unknown error"
                        }`,
                    },
                ],
            };
        }
    },
);


server.registerTool(
  "list_github_files",
  {
    title: "List GitHub Repository Files",
    description:
      "List files and directories in a GitHub repository or directory. Use returned paths to select files for code review.",
    inputSchema: {
      owner: z.string().min(1).max(100),
      repo: z.string().min(1).max(100),
      path: z.string().max(500).optional(),
      ref: z.string().min(1).max(200).optional(),
    },
  },
  async ({ owner, repo, path, ref }) => {
    try {
      const result = await listGitHubFiles({
        owner,
        repo,
        path,
        ref,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `GitHub directory listing failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  },
);


// Start the MCP server using stdio
const transport = new StdioServerTransport();
await server.connect(transport);
