
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
    },
    {
      path: "src/removed.js",
      status: "removed",
      changes: 5,
    },
    {
      path: "README.md",
      status: "modified",
      changes: 2,
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
});
