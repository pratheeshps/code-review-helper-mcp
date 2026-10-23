
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPullsGet,
  mockPullsListFiles,
  mockPaginate,
} = vi.hoisted(() => ({
  mockPullsGet: vi.fn(),
  mockPullsListFiles: vi.fn(),
  mockPaginate: vi.fn(),
}));

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    rest = {
      pulls: {
        get: mockPullsGet,
        listFiles: mockPullsListFiles,
      },
    };

    paginate = mockPaginate;
  },
}));

import { getPullRequestFiles } from "../src/tools/github-pr.js";

describe("getPullRequestFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPullsGet.mockResolvedValue({
      data: {
        number: 12,
        title: "Add new feature",
        state: "open",
        head: {
          sha: "head-sha-123",
          ref: "feature/new-feature",
        },
        base: {
          ref: "main",
        },
      },
    });

    mockPaginate.mockResolvedValue([
      {
        filename: "src/index.js",
        status: "modified",
        additions: 5,
        deletions: 2,
        changes: 7,
        patch: "@@ -1 +1 @@",
      },
      {
        filename: "src/new-file.js",
        status: "added",
        additions: 10,
        deletions: 0,
        changes: 10,
      },
    ]);
  });

  it("returns pull request metadata and mapped file details", async () => {
    const result = await getPullRequestFiles({
      owner: "test-owner",
      repo: "test-repo",
      pullNumber: 12,
    });

    expect(mockPullsGet).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      pull_number: 12,
    });

    expect(mockPaginate).toHaveBeenCalledWith(
      mockPullsListFiles,
      {
        owner: "test-owner",
        repo: "test-repo",
        pull_number: 12,
        per_page: 100,
      },
    );

    expect(result).toEqual({
      owner: "test-owner",
      repo: "test-repo",
      pullNumber: 12,
      title: "Add new feature",
      state: "open",
      headSha: "head-sha-123",
      baseRef: "main",
      headRef: "feature/new-feature",
      files: [
        {
          path: "src/index.js",
          status: "modified",
          additions: 5,
          deletions: 2,
          changes: 7,
          patchAvailable: true,
        },
        {
          path: "src/new-file.js",
          status: "added",
          additions: 10,
          deletions: 0,
          changes: 10,
          patchAvailable: false,
        },
      ],
    });
  });

  it("returns an empty file list when no files have changed", async () => {
    mockPaginate.mockResolvedValue([]);

    const result = await getPullRequestFiles({
      owner: "test-owner",
      repo: "test-repo",
      pullNumber: 12,
    });

    expect(result.files).toEqual([]);
  });

  it("propagates errors when retrieving pull request metadata", async () => {
    mockPullsGet.mockRejectedValue(
      new Error("Pull request not found"),
    );

    await expect(
      getPullRequestFiles({
        owner: "test-owner",
        repo: "test-repo",
        pullNumber: 999,
      }),
    ).rejects.toThrow("Pull request not found");

    expect(mockPaginate).not.toHaveBeenCalled();
  });

  it("propagates errors when retrieving changed files", async () => {
    mockPaginate.mockRejectedValue(
      new Error("File listing failed"),
    );

    await expect(
      getPullRequestFiles({
        owner: "test-owner",
        repo: "test-repo",
        pullNumber: 12,
      }),
    ).rejects.toThrow("File listing failed");
  });
});
