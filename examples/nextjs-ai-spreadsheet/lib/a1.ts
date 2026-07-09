// Helpers for converting between zero-based grid indices and Excel-style A1
// references (e.g. column 0 → "A", "AA" → column 26, "B5" → { row: 4, col: 1 }).
// Shared by the toolbar, the cell renderer, and the AI tools on the server.

// 0 → "A", 25 → "Z", 26 → "AA", …
export function colIndexToLetters(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

// "A" → 0, "Z" → 25, "AA" → 26. Returns -1 for invalid input.
export function lettersToColIndex(letters: string): number {
  const upper = letters.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(upper)) {
    return -1;
  }
  let n = 0;
  for (const char of upper) {
    n = n * 26 + (char.charCodeAt(0) - 64);
  }
  return n - 1;
}

export type RowCol = { row: number; col: number };

// "B5" → { row: 4, col: 1 }. Returns null for invalid input.
export function parseA1(ref: string): RowCol | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) {
    return null;
  }
  const col = lettersToColIndex(match[1]);
  const row = Number.parseInt(match[2], 10) - 1;
  if (col < 0 || row < 0 || Number.isNaN(row)) {
    return null;
  }
  return { row, col };
}

export function toA1(row: number, col: number): string {
  return `${colIndexToLetters(col)}${row + 1}`;
}

export type A1Range = { start: RowCol; end: RowCol };

// "A1:C3" or a single "B2" → normalized range with start ≤ end on both axes.
export function parseA1Range(ref: string): A1Range | null {
  const [startRef, endRef] = ref.split(":");
  const start = parseA1(startRef ?? "");
  if (!start) {
    return null;
  }
  const end = endRef ? parseA1(endRef) : start;
  if (!end) {
    return null;
  }
  return {
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col),
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col),
    },
  };
}
