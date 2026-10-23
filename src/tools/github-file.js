
import { Octokit } from "@octokit/rest";

const MAX_SOURCE_LENGTH = 20_000;

export async function fetchGitHubFile({
  owner,
  repo,
  path,
  ref,
}) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: "code-review-helper-mcp",
  });

  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ...(ref ? { ref } : {}),
  });

  const file = response.data;

  if (Array.isArray(file) || file.type !== "file") {
    throw new Error("The requested path is not a single file.");
  }

  if (file.encoding !== "base64" || !file.content) {
    throw new Error(
      "GitHub did not return file content in the expected format.",
    );
  }

  const code = Buffer.from(file.content, "base64").toString("utf8");

  if (code.length > MAX_SOURCE_LENGTH) {
    throw new Error(
      `File exceeds the ${MAX_SOURCE_LENGTH}-character review limit.`,
    );
  }

  return {
    owner,
    repo,
    path,
    ref: ref ?? response.data.sha,
    sha: file.sha,
    size: file.size,
    code,
  };
}
