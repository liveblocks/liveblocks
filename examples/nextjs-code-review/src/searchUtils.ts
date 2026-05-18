export interface SearchMatch {
  itemId: string;
  lineNumber: number;
  side: "additions" | "deletions";
}

export function getDiffSearchMatches(
  query: string,
  items: readonly { id: string; fileDiff: { additionLines: string[] } }[]
): SearchMatch[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  const matches: SearchMatch[] = [];
  for (const item of items) {
    const lines = item.fileDiff.additionLines;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        matches.push({ itemId: item.id, lineNumber: i + 1, side: "additions" });
      }
    }
  }
  return matches;
}
