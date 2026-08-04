import type { Position, Range } from "@pierre/diffs";

export function positionToOffset(text: string, position: Position) {
  const lineStarts = getLineStarts(text);
  const line = Math.max(0, Math.min(position.line, lineStarts.length - 1));
  const lineStart = lineStarts[line];
  const lineEnd =
    line + 1 < lineStarts.length ? lineStarts[line + 1] - 1 : text.length;

  return Math.max(
    lineStart,
    Math.min(lineStart + position.character, lineEnd)
  );
}

export function offsetToPosition(text: string, offset: number): Position {
  const lineStarts = getLineStarts(text);
  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineStarts[mid];
    const nextLineStart = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;

    if (clampedOffset < lineStart) {
      high = mid - 1;
    } else if (clampedOffset >= nextLineStart) {
      low = mid + 1;
    } else {
      return {
        line: mid,
        character: clampedOffset - lineStart,
      };
    }
  }

  return {
    line: 0,
    character: 0,
  };
}

export function rangeToSelection(
  text: string,
  range: Range & { direction: -1 | 0 | 1 }
): Liveblocks["Presence"]["selection"] {
  const start = positionToOffset(text, range.start);
  const end = positionToOffset(text, range.end);

  return range.direction === -1
    ? { anchor: end, focus: start }
    : { anchor: start, focus: end };
}

function getLineStarts(text: string) {
  const lineStarts = [0];

  for (let index = 0; index < text.length; index++) {
    if (text[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}
