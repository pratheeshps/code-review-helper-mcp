
import { describe, expect, it } from "vitest";
import { fetchGitHubFile } from "../src/tools/github-file.js";

describe("fetchGitHubFile", () => {
  it("fetches a JavaScript file from a public repository", async () => {
    const result = await fetchGitHubFile({
      owner: "octocat",
      repo: "Hello-World",
      path: "README",
    });

    expect(result.owner).toBe("octocat");
    expect(result.repo).toBe("Hello-World");
    expect(result.path).toBe("README");
    expect(result.code).toContain("Hello World");
    expect(result.sha).toBeTruthy();
  });
});
