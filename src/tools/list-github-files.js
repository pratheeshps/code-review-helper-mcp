
import { Octokit } from "@octokit/rest";

export async function listGitHubFiles({
  owner,
  repo,
  path = "",
  ref,
}) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: "code-review-helper-mcp",
  });

  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    ...(path ? { path } : {}),
    ...(ref ? { ref } : {}),
  });

  if (!Array.isArray(response.data)) {
    throw new Error(
      "The requested path is a file, not a directory. Provide a directory path.",
    );
  }

  return {
    owner,
    repo,
    path: path || "/",
    ref: ref ?? null,
    count: response.data.length,
    entries: response.data.map((entry) => ({
      name: entry.name,
      path: entry.path,
      type: entry.type,
      size: entry.size,
      sha: entry.sha,
    })),
    note:
      "This lists one directory level. Use a returned directory path to inspect its contents.",
  };
}
