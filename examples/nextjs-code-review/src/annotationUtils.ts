const CONTEXT_LINES = 3;

interface AnnotationAnchor {
  lineContent: string;
  contextBefore: string;
  contextAfter: string;
  lineNumber: number;
}

export interface ResolvedAnnotation {
  lineNumber: number;
  side: "additions" | "deletions";
}

export function extractLineContext(
  content: string,
  lineNumber: number
): { lineContent: string; contextBefore: string; contextAfter: string } {
  const lines = content.split("\n");
  const idx = lineNumber - 1;
  return {
    lineContent: lines[idx] ?? "",
    contextBefore: lines
      .slice(Math.max(0, idx - CONTEXT_LINES), idx)
      .join("\n"),
    contextAfter: lines
      .slice(idx + 1, Math.min(lines.length, idx + 1 + CONTEXT_LINES))
      .join("\n"),
  };
}

// Searches `lines` for the best match for `anchor` using context scoring.
// Returns a 1-indexed line number, or null if no match.
function findBestMatch(
  anchor: AnnotationAnchor,
  lines: string[]
): number | null {
  const contextBefore = anchor.contextBefore
    ? anchor.contextBefore.split("\n")
    : [];
  const contextAfter = anchor.contextAfter
    ? anchor.contextAfter.split("\n")
    : [];

  let bestScore = -1;
  let bestLine: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== anchor.lineContent) continue;

    let score = 0;
    for (let j = 0; j < contextBefore.length; j++) {
      const idx = i - contextBefore.length + j;
      if (idx >= 0 && lines[idx] === contextBefore[j]) score++;
    }
    for (let j = 0; j < contextAfter.length; j++) {
      const idx = i + 1 + j;
      if (idx < lines.length && lines[idx] === contextAfter[j]) score++;
    }

    // Break ties by proximity to original line number.
    const proximity = 1 / (1 + Math.abs(i + 1 - anchor.lineNumber));
    const total = score + proximity;

    if (total > bestScore) {
      bestScore = total;
      bestLine = i + 1;
    }
  }

  return bestLine;
}

// Maps stored anchor metadata to a current { lineNumber, side } by searching
// newContent first (→ additions), then oldContent (→ deletions).
// Returns null when the annotated line no longer exists (outdated).
export function resolveAnnotation(
  anchor: AnnotationAnchor,
  oldContent: string,
  newContent: string
): ResolvedAnnotation | null {
  const newLine = findBestMatch(anchor, newContent.split("\n"));
  if (newLine !== null) return { lineNumber: newLine, side: "additions" };

  const oldLine = findBestMatch(anchor, oldContent.split("\n"));
  if (oldLine !== null) return { lineNumber: oldLine, side: "deletions" };

  return null;
}
