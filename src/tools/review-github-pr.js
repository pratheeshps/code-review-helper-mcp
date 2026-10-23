import { getPullRequestFiles } from "./github-pr.js";
import { fetchGitHubFile } from "./github-file.js";
import { reviewCode } from "./review-code.js";
import { getChangedLines } from "./changed-lines.js";

const SUPPORTED_FILE_PATTERN = /\.(js|mjs|cjs)$/i;

export async function reviewGitHubPullRequest({ owner, repo, pullNumber }) {
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

            const patchAvailable =
                typeof file.patch === "string" && file.patch.length > 0;

            const changedLines = patchAvailable
                ? getChangedLines(file.patch)
                : null;

            const changedLineSet = new Set(changedLines ?? []);

            const changedFindings = patchAvailable
                ? report.findings.filter((finding) =>
                      changedLineSet.has(finding.line),
                  )
                : report.findings;

            const findingsSummary = {
                totalFindings: changedFindings.length,
                error: changedFindings.filter(
                    (item) => item.severity === "error",
                ).length,
                warning: changedFindings.filter(
                    (item) => item.severity === "warning",
                ).length,
                info: changedFindings.filter((item) => item.severity === "info")
                    .length,
            };

            reviewedFiles.push({
                path: file.path,
                status: file.status,
                changes: file.changes,
                sha: source.sha,
                patchAvailable,
                changedLines,
                reviewScope: patchAvailable ? "changed-lines" : "full-file",
                reviewNote: patchAvailable
                    ? "Findings are filtered to line numbers represented in the available patch."
                    : "Patch unavailable; findings cover the full file and may include unchanged code.",
                report: {
                    ...report,
                    findings: changedFindings,
                    summary: {
                        ...report.summary,
                        ...findingsSummary,
                        failedChecks: changedFindings.filter(
                            (item) => item.severity === "error",
                        ).length,
                    },
                },
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

    const hasErrors = findings.some((finding) => finding.severity === "error");

    const hasWarnings = findings.some(
        (finding) => finding.severity === "warning",
    );

    const hasFailedChecks = reviewedFiles.some(
        (file) => file.report.summary.failedChecks > 0,
    );

    const isIncomplete = skippedFiles.length > 0 || hasFailedChecks;

    const verdict = hasErrors
        ? "needs_changes"
        : hasWarnings
          ? "review_with_warnings"
          : isIncomplete
            ? "review_incomplete"
            : "approved";

    return {
        verdict,
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
            warning: findings.filter((item) => item.severity === "warning")
                .length,
            info: findings.filter((item) => item.severity === "info").length,
            failedChecks: reviewedFiles.reduce(
                (total, file) => total + file.report.summary.failedChecks,
                0,
            ),
        },
        qualityReport: {
            supportedFilesReviewed: reviewedFiles.length,
            filesSkipped: skippedFiles.length,
            filesWithPatch: reviewedFiles.filter((file) => file.patchAvailable)
                .length,
            filesReviewedWithoutPatch: reviewedFiles.filter(
                (file) => !file.patchAvailable,
            ).length,
            checksWithErrors: reviewedFiles.filter(
                (file) => file.report.summary.failedChecks > 0,
            ).length,
        },
        files: reviewedFiles,
        skippedFiles,
        findings,
        reviewLimitations: [
            "Only JavaScript, MJS, and CJS files are reviewed.",
            "GitHub may omit patch content for some files.",
            "Available patches may not represent every changed line.",
            "Full-file fallback findings may include issues outside the pull request changes.",
        ],
    };
}
