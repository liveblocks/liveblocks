import type { Position } from "@pierre/diffs";

/**
 * Converts a document offset into a zero-based `{ line, character }` position.
 * Offsets outside the document are clamped.
 */
export function offsetToPosition(text: string, offset: number): Position {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let line = 0;
  let lineStart = 0;
  for (
    let index = text.indexOf("\n");
    index !== -1 && index < clamped;
    index = text.indexOf("\n", index + 1)
  ) {
    line++;
    lineStart = index + 1;
  }
  return { line, character: clamped - lineStart };
}

/**
 * Converts a zero-based `{ line, character }` position into a document offset.
 * Positions outside the document are clamped.
 */
export function positionToOffset(text: string, position: Position): number {
  let offset = 0;
  for (let line = 0; line < position.line; line++) {
    const next = text.indexOf("\n", offset);
    if (next === -1) {
      return text.length;
    }
    offset = next + 1;
  }
  const nextBreak = text.indexOf("\n", offset);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  return Math.min(offset + Math.max(0, position.character), lineEnd);
}
