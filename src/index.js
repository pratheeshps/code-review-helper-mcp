import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { analyzeJavaScript } from "./tools/analyze-code.js";

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

// Start the MCP server using stdio
const transport = new StdioServerTransport();
await server.connect(transport);
