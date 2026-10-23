
import { describe, expect, it } from "vitest";
import { listGitHubFiles } from "../src/tools/list-github-files.js";

describe("listGitHubFiles", () => {
  it("lists entries in a public repository", async () => {
    const result = await listGitHubFiles({
      owner: "octocat",
      repo: "Spoon-Knife",
    });

    expect(result.owner).toBe("octocat");
    expect(result.repo).toBe("Spoon-Knife");
    expect(result.count).toBeGreaterThan(0);
    expect(result.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "README.md",
          type: "file",
        }),
      ]),
    );
  });
});
