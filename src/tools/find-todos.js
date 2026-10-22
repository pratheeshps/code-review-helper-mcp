const TODO_PATTERN =
    /(?:\/\/|\/\*)\s*(TODO|FIXME|HACK)\b\s*:?\s*(.*?)(?:\*\/)?$/i;

export function findTodos(code) {
    const lines = code.split(/\r?\n/);
    const findings = [];

    lines.forEach((line, index) => {
        // Only inspect text beginning at a comment marker.
        const commentStart = line.search(/\/\/|\/\*/);

        if (commentStart === -1) return;

        const comment = line.slice(commentStart);
        const match = comment.match(TODO_PATTERN);

        if (!match) return;

        findings.push({
            line: index + 1,
            tag: match[1].toUpperCase(),
            message: match[2].replace(/\*\/\s*$/, "").trim(),
            code: comment.trim(),
        });
    });

    return {
        linesScanned: lines.length,
        findingCount: findings.length,
        findings,
        note:
            "Scans single-line comments and single-line block comments. " +
            "This initial implementation does not parse JavaScript syntax.",
    };
}
