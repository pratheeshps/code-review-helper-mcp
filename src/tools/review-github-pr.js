
import { getPullRequestFiles } from "./github-pr.js";
import { fetchGitHubFile } from "./github-file.js";
import { reviewCode } from "./review-code.js";

const SUPPORTED_FILE_PATTERN = /\.(js|mjs|cjs)$/i;

export async function reviewGitHubPullRequest({
  owner,
  repo,
  pullNumber,
}) {
  const pullRequest = await getPullRequestFiles({
    owner,
    repo,
    pullNumber,
  });

  const reviewedFiles = [];
  const skippedFiles = [];

  for (const file of pullRequest.files) {
    if (file.status === "removed") {
      skippedFiles.push({
        path: file.path,
        reason: "Deleted files cannot be reviewed from the PR head.",
      });
      continue;
    }

    if (!SUPPORTED_FILE_PATTERN.test(file.path)) {
      skippedFiles.push({
        path: file.path,
        reason: "Unsupported file type.",
      });
      continue;
    }

    try {
      const source = await fetchGitHubFile({
        owner,
        repo,
        path: file.path,
        ref: pullRequest.headSha,
      });

      const report = reviewCode(source.code);

      reviewedFiles.push({
        path: file.path,
        status: file.status,
        changes: file.changes,
        sha: source.sha,
        report,
      });
    } catch (error) {
      skippedFiles.push({
        path: file.path,
        reason:
          error instanceof Error
            ? error.message
            : "Unknown error while reviewing file.",
      });
    }
  }

  const findings = reviewedFiles.flatMap((file) =>
    file.report.findings.map((finding) => ({
      ...finding,
      file: file.path,
    })),
  );

  return {
    pullRequest: {
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      number: pullRequest.pullNumber,
      title: pullRequest.title,
      state: pullRequest.state,
      baseRef: pullRequest.baseRef,
      headRef: pullRequest.headRef,
      headSha: pullRequest.headSha,
    },
    summary: {
      filesChanged: pullRequest.files.length,
      filesReviewed: reviewedFiles.length,
      filesSkipped: skippedFiles.length,
      totalFindings: findings.length,
      error: findings.filter((item) => item.severity === "error").length,
      warning: findings.filter((item) => item.severity === "warning").length,
      info: findings.filter((item) => item.severity === "info").length,
      failedChecks: reviewedFiles.reduce(
        (total, file) => total + file.report.summary.failedChecks,
        0,
      ),
    },
    files: reviewedFiles,
    skippedFiles,
    findings,
  };
}
