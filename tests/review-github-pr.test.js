import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/tools/github-pr.js", () => ({
    getPullRequestFiles: vi.fn(),
}));

vi.mock("../src/tools/github-file.js", () => ({
    fetchGitHubFile: vi.fn(),
}));

vi.mock("../src/tools/review-code.js", () => ({
    reviewCode: vi.fn(),
}));

import { getPullRequestFiles } from "../src/tools/github-pr.js";
import { fetchGitHubFile } from "../src/tools/github-file.js";
import { reviewCode } from "../src/tools/review-code.js";
import { reviewGitHubPullRequest } from "../src/tools/review-github-pr.js";

const mockPullRequest = {
    owner: "test-owner",
    repo: "test-repo",
    pullNumber: 12,
    title: "Add sample feature",
    state: "open",
    baseRef: "main",
    headRef: "feature/sample",
    headSha: "abc123",
    files: [
        {
            path: "src/example.js",
            status: "added",
            changes: 10,
            patch: [
                "@@ -0,0 +3,3 @@",
                "+const changedLineThree = 1;",
                "+const changedLineFour = 1;",
                "+const changedLineFive = 1;",
            ].join("\n"),
        },
        {
            path: "src/removed.js",
            status: "removed",
            changes: 5,
            patch: null,
        },
        {
            path: "README.md",
            status: "modified",
            changes: 2,
            patch: null,
        },
    ],
};

const mockReport = {
    summary: {
        totalFindings: 2,
        error: 1,
        warning: 1,
        info: 0,
        failedChecks: 1,
    },
    findings: [
        {
            id: "finding-1",
            severity: "error",
            rule: "no-undef",
            message: "Undefined variable",
            line: 3,
        },
        {
            id: "finding-2",
            severity: "warning",
            rule: "naming-convention",
            message: "Use camelCase",
            line: 5,
        },
    ],
};

describe("reviewGitHubPullRequest", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        getPullRequestFiles.mockResolvedValue(mockPullRequest);

        fetchGitHubFile.mockResolvedValue({
            code: "const example = 1;",
            sha: "file-sha-123",
        });

        reviewCode.mockReturnValue(mockReport);
    });

    it("reviews supported JavaScript files and combines findings", async () => {
        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(getPullRequestFiles).toHaveBeenCalledWith({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(fetchGitHubFile).toHaveBeenCalledWith({
            owner: "test-owner",
            repo: "test-repo",
            path: "src/example.js",
            ref: "abc123",
        });

        expect(reviewCode).toHaveBeenCalledWith("const example = 1;");

        expect(result.pullRequest.number).toBe(12);
        expect(result.summary.filesChanged).toBe(3);
        expect(result.summary.filesReviewed).toBe(1);
        expect(result.summary.filesSkipped).toBe(2);
        expect(result.summary.totalFindings).toBe(2);
        expect(result.summary.error).toBe(1);
        expect(result.summary.warning).toBe(1);
        expect(result.summary.failedChecks).toBe(1);

        expect(result.findings).toHaveLength(2);
        expect(result.findings[0].file).toBe("src/example.js");
        expect(result.files[0].sha).toBe("file-sha-123");
        expect(result.qualityReport).toMatchObject({
            supportedFilesReviewed: 1,
            filesSkipped: 2,
            filesWithPatch: 1,
            filesReviewedWithoutPatch: 0,
            checksWithErrors: 1,
        });
    });

    it("skips deleted files without fetching them", async () => {
        await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(fetchGitHubFile).not.toHaveBeenCalledWith(
            expect.objectContaining({
                path: "src/removed.js",
            }),
        );
    });

    it("skips unsupported file types", async () => {
        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(result.skippedFiles).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: "README.md",
                    reason: "Unsupported file type.",
                }),
            ]),
        );
    });

    it("continues reviewing when fetching a file fails", async () => {
        fetchGitHubFile.mockRejectedValueOnce(
            new Error("GitHub API request failed"),
        );

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(result.summary.filesReviewed).toBe(0);
        expect(result.summary.filesSkipped).toBe(3);
        expect(result.skippedFiles).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: "src/example.js",
                    reason: "GitHub API request failed",
                }),
            ]),
        );
        expect(result.findings).toHaveLength(0);
    });

    it("returns an empty findings list when no supported files exist", async () => {
        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "README.md",
                    status: "modified",
                    changes: 2,
                },
            ],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(result.summary.filesReviewed).toBe(0);
        expect(result.summary.totalFindings).toBe(0);
        expect(result.findings).toEqual([]);
        expect(reviewCode).not.toHaveBeenCalled();
    });

    it("keeps all findings when a GitHub patch is unavailable", async () => {
        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "src/example.js",
                    status: "modified",
                    changes: 10,
                    patch: null,
                },
            ],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(result.files[0].patchAvailable).toBe(false);
        expect(result.files[0].changedLines).toBeNull();
        expect(result.files[0].reviewScope).toBe("full-file");
        expect(result.files[0].report.findings).toHaveLength(2);
        expect(result.summary.totalFindings).toBe(2);
    });

    it("keeps finding details when the finding is on a changed line", async () => {
        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "src/example.js",
                    status: "modified",
                    changes: 2,
                    patch: "@@ -1,2 +1,2 @@\n const first = 1;\n+const second = 2;",
                },
            ],
        });

        reviewCode.mockReturnValue({
            summary: {
                totalFindings: 2,
                error: 1,
                warning: 1,
                info: 0,
                failedChecks: 1,
            },
            findings: [
                {
                    id: "finding-changed",
                    line: 2,
                    column: 1,
                    severity: "error",
                    rule: "no-undef",
                    message: "Undefined variable",
                    recommendation: "Define or import this identifier.",
                },
                {
                    id: "finding-unchanged",
                    line: 1,
                    column: 1,
                    severity: "warning",
                    rule: "no-var",
                    message: "Use const or let.",
                    recommendation: "Replace var with const or let.",
                },
            ],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0]).toMatchObject({
            id: "finding-changed",
            file: "src/example.js",
            line: 2,
            column: 1,
            severity: "error",
            rule: "no-undef",
            recommendation: "Define or import this identifier.",
        });

        expect(result.summary.totalFindings).toBe(1);
        expect(result.summary.error).toBe(1);
        expect(result.summary.warning).toBe(0);
        expect(result.summary.info).toBe(0);
    });

    it("reports limitations of patch-based review", async () => {
        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(result.reviewLimitations).toEqual(
            expect.arrayContaining([
                expect.stringContaining("GitHub may omit patch content"),
                expect.stringContaining("Available patches may not represent"),
            ]),
        );
    });

    it("returns needs_changes when an error finding exists", async () => {
        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 12,
        });

        expect(result.verdict).toBe("needs_changes");
    });

    it("returns review_with_warnings when only warnings exist", async () => {
        reviewCode.mockReturnValue({
            summary: {
                totalFindings: 1,
                error: 0,
                warning: 1,
                info: 0,
                failedChecks: 0,
            },
            findings: [
                {
                    id: "warning-1",
                    severity: "warning",
                    rule: "naming-convention",
                    message: "Use camelCase",
                    line: 3,
                },
            ],
        });

        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "src/example.js",
                    status: "modified",
                    changes: 1,
                    patch: null,
                },
            ],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 13,
        });

        expect(result.verdict).toBe("review_with_warnings");
    });

    it("returns review_incomplete when files are skipped and no findings exist", async () => {
        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "README.md",
                    status: "modified",
                    changes: 2,
                    patch: null,
                },
            ],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 14,
        });

        expect(result.verdict).toBe("review_incomplete");
        expect(result.summary.filesSkipped).toBe(1);
        expect(result.findings).toHaveLength(0);
    });

    it("returns approved when there are no findings or skipped files", async () => {
        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "src/clean.js",
                    status: "modified",
                    changes: 1,
                    patch: null,
                },
            ],
        });

        reviewCode.mockReturnValue({
            summary: {
                totalFindings: 0,
                error: 0,
                warning: 0,
                info: 0,
                failedChecks: 0,
            },
            findings: [],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 15,
        });

        expect(result.verdict).toBe("approved");
        expect(result.summary.filesSkipped).toBe(0);
        expect(result.summary.totalFindings).toBe(0);
    });

    it("reports zero reviewed files when all files are unsupported", async () => {
        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "README.md",
                    status: "modified",
                    changes: 2,
                    patch: null,
                },
            ],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 16,
        });

        expect(result.qualityReport).toMatchObject({
            supportedFilesReviewed: 0,
            filesSkipped: 1,
            filesWithPatch: 0,
            filesReviewedWithoutPatch: 0,
            checksWithErrors: 0,
        });
    });

    it("reports files reviewed without a patch", async () => {
        getPullRequestFiles.mockResolvedValue({
            ...mockPullRequest,
            files: [
                {
                    path: "src/clean.js",
                    status: "modified",
                    changes: 1,
                    patch: null,
                },
            ],
        });

        reviewCode.mockReturnValue({
            summary: {
                totalFindings: 0,
                error: 0,
                warning: 0,
                info: 0,
                failedChecks: 0,
            },
            findings: [],
        });

        const result = await reviewGitHubPullRequest({
            owner: "test-owner",
            repo: "test-repo",
            pullNumber: 17,
        });

        expect(result.qualityReport).toMatchObject({
            supportedFilesReviewed: 1,
            filesSkipped: 0,
            filesWithPatch: 0,
            filesReviewedWithoutPatch: 1,
            checksWithErrors: 0,
        });

        expect(result.files[0].reviewScope).toBe("full-file");
    });
});
