
import { Octokit } from "@octokit/rest";

export async function getPullRequestFiles({
  owner,
  repo,
  pullNumber,
}) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: "code-review-helper-mcp",
  });

  const pullResponse = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });

  const pullRequest = pullResponse.data;

  const files = await octokit.paginate(
    octokit.rest.pulls.listFiles,
    {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    },
  );

  return {
    owner,
    repo,
    pullNumber,
    title: pullRequest.title,
    state: pullRequest.state,
    headSha: pullRequest.head.sha,
    baseRef: pullRequest.base.ref,
    headRef: pullRequest.head.ref,
    files: files.map((file) => ({
      path: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patchAvailable: Boolean(file.patch),
    })),
  };
}
