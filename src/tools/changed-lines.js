
/**
 * Extracts line numbers added or modified in the new file
 * from a GitHub unified diff patch.
 *
 * GitHub patch format uses lines such as:
 * @@ -10,3 +10,4 @@
 */
export function getChangedLines(patch) {
  if (!patch || typeof patch !== "string") {
    return [];
  }

  const changedLines = new Set();
  let newLineNumber = 0;

  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,(\d+))?/);

      if (match) {
        newLineNumber = Number(match[1]);
      }

      continue;
    }

    // Ignore metadata and the "no newline" marker.
    if (
      line.startsWith("\\") ||
      line.startsWith("diff ") ||
      line.startsWith("index ") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      continue;
    }

    if (line.startsWith("+")) {
      changedLines.add(newLineNumber);
      newLineNumber += 1;
    } else if (line.startsWith("-")) {
      // Removed lines do not exist in the new file.
      continue;
    } else if (line.startsWith(" ")) {
      newLineNumber += 1;
    }
  }

  return [...changedLines].sort((a, b) => a - b);
}
