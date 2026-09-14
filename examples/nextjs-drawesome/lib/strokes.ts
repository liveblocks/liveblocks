import type { Point, Stroke } from "drawesome";

export const STROKE_ID_STRIDE = 1_000_000;

export type DraftStroke = {
  pen: Stroke["pen"];
  color: string;
  size: number;
  opacity: number;
  points: Point[];
  erase?: boolean;
  shape?: Stroke["shape"];
};

export function ownerConnectionId(strokeId: number): number {
  return Math.floor(strokeId / STROKE_ID_STRIDE);
}

export function toGlobalStrokeId(connectionId: number, localId: number): number {
  return connectionId * STROKE_ID_STRIDE + (localId % STROKE_ID_STRIDE);
}

export function strokesEqual(
  a: readonly Stroke[],
  b: readonly Stroke[]
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function remapNewStrokeIds(
  strokes: Stroke[],
  connectionId: number,
  existingIds: ReadonlySet<number>
): Stroke[] {
  let changed = false;

  const remapped = strokes.map((stroke) => {
    if (
      existingIds.has(stroke.id) ||
      ownerConnectionId(stroke.id) === connectionId
    ) {
      return stroke;
    }

    changed = true;
    return {
      ...stroke,
      id: toGlobalStrokeId(connectionId, stroke.id),
    };
  });

  return changed ? remapped : strokes;
}
