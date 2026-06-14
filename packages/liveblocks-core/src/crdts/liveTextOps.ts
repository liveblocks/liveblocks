import { freeze } from "../lib/freeze";
import type { Json, JsonObject } from "../lib/Json";
import { stableStringify } from "../lib/stringify";
import type {
  LiveTextData,
  TextAttributes,
  TextOperation,
} from "../protocol/Op";

export type TextSegment = {
  text: string;
  attributes?: TextAttributes;
};

export function attributesEqual(
  left: TextAttributes | undefined,
  right: TextAttributes | undefined
): boolean {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}

function cloneAttributes(
  attributes: TextAttributes | undefined
): TextAttributes | undefined {
  return attributes === undefined ? undefined : freeze({ ...attributes });
}

export function normalizeSegments(
  segments: readonly TextSegment[]
): TextSegment[] {
  const normalized: TextSegment[] = [];
  for (const segment of segments) {
    if (segment.text.length === 0) {
      continue;
    }

    const last = normalized.at(-1);
    const attributes = cloneAttributes(segment.attributes);
    if (last !== undefined && attributesEqual(last.attributes, attributes)) {
      last.text += segment.text;
    } else {
      normalized.push({ text: segment.text, attributes });
    }
  }
  return normalized;
}

export function dataToSegments(data: LiveTextData): TextSegment[] {
  return normalizeSegments(
    data.map(([text, attributes]) => ({
      text,
      attributes,
    }))
  );
}

export function segmentsToData(segments: readonly TextSegment[]): LiveTextData {
  return segments.map((segment) =>
    segment.attributes === undefined
      ? [segment.text]
      : [segment.text, { ...segment.attributes }]
  );
}

export function textLength(segments: readonly TextSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.text.length, 0);
}

export function splitSegmentsAt(
  segments: readonly TextSegment[],
  index: number
): TextSegment[] {
  const result: TextSegment[] = [];
  let offset = 0;

  for (const segment of segments) {
    const end = offset + segment.text.length;
    if (index > offset && index < end) {
      const before = segment.text.slice(0, index - offset);
      const after = segment.text.slice(index - offset);
      result.push({ text: before, attributes: segment.attributes });
      result.push({ text: after, attributes: segment.attributes });
    } else {
      result.push({ text: segment.text, attributes: segment.attributes });
    }
    offset = end;
  }

  return result;
}

export function clipRange(
  index: number,
  length: number,
  contentLength: number
): { index: number; length: number } {
  const clippedIndex = Math.max(0, Math.min(index, contentLength));
  const clippedEnd = Math.max(
    clippedIndex,
    Math.min(index + length, contentLength)
  );
  return { index: clippedIndex, length: clippedEnd - clippedIndex };
}

export function applyInsert(
  segments: readonly TextSegment[],
  index: number,
  text: string,
  attributes?: TextAttributes
): TextSegment[] {
  if (text.length === 0) {
    return normalizeSegments(segments);
  }

  const split = splitSegmentsAt(segments, index);
  const result: TextSegment[] = [];
  let offset = 0;
  let inserted = false;

  for (const segment of split) {
    if (!inserted && offset === index) {
      result.push({ text, attributes });
      inserted = true;
    }
    result.push(segment);
    offset += segment.text.length;
  }

  if (!inserted) {
    result.push({ text, attributes });
  }

  return normalizeSegments(result);
}

export function extractDeletedSegments(
  segments: readonly TextSegment[],
  index: number,
  length: number
): TextSegment[] {
  const split = splitSegmentsAt(
    splitSegmentsAt(segments, index),
    index + length
  );
  const deleted: TextSegment[] = [];
  let offset = 0;

  for (const segment of split) {
    const end = offset + segment.text.length;
    if (offset >= index && end <= index + length) {
      deleted.push({
        text: segment.text,
        attributes: segment.attributes,
      });
    }
    offset = end;
  }

  return normalizeSegments(deleted);
}

export function applyDelete(
  segments: readonly TextSegment[],
  index: number,
  length: number
): {
  segments: TextSegment[];
  deletedText: string;
  deletedSegments: TextSegment[];
} {
  const deletedSegments = extractDeletedSegments(segments, index, length);
  const split = splitSegmentsAt(
    splitSegmentsAt(segments, index),
    index + length
  );
  const result: TextSegment[] = [];
  let offset = 0;
  let deletedText = "";

  for (const segment of split) {
    const end = offset + segment.text.length;
    if (offset >= index && end <= index + length) {
      deletedText += segment.text;
    } else {
      result.push(segment);
    }
    offset = end;
  }

  return {
    segments: normalizeSegments(result),
    deletedText,
    deletedSegments,
  };
}

export function applyFormat(
  segments: readonly TextSegment[],
  index: number,
  length: number,
  attributes: JsonObject
): TextSegment[] {
  const split = splitSegmentsAt(
    splitSegmentsAt(segments, index),
    index + length
  );
  const result: TextSegment[] = [];
  let offset = 0;

  for (const segment of split) {
    const end = offset + segment.text.length;
    if (offset >= index && end <= index + length) {
      const nextAttributes: JsonObject = {
        ...(segment.attributes ?? {}),
      };
      for (const [key, value] of Object.entries(attributes)) {
        if (value === null) {
          delete nextAttributes[key];
        } else {
          nextAttributes[key] = value;
        }
      }
      result.push({
        text: segment.text,
        attributes:
          Object.keys(nextAttributes).length === 0
            ? undefined
            : freeze(nextAttributes),
      });
    } else {
      result.push(segment);
    }
    offset = end;
  }

  return normalizeSegments(result);
}

export function formatReverseOperations(
  segments: readonly TextSegment[],
  index: number,
  length: number,
  patch: JsonObject
): TextOperation[] {
  const split = splitSegmentsAt(
    splitSegmentsAt(segments, index),
    index + length
  );
  const result: TextOperation[] = [];
  let offset = 0;

  for (const segment of split) {
    const end = offset + segment.text.length;
    if (offset >= index && end <= index + length) {
      const attributes: Record<string, Json | null> = {};
      for (const key of Object.keys(patch)) {
        attributes[key] = segment.attributes?.[key] ?? null;
      }
      result.push({
        type: "format",
        index: offset,
        length: segment.text.length,
        attributes,
      });
    }
    offset = end;
  }

  return result;
}

function mapIndexThroughOperation(index: number, op: TextOperation): number {
  if (op.type === "insert") {
    return op.index <= index ? index + op.text.length : index;
  } else if (op.type === "delete") {
    if (op.index >= index) {
      return index;
    }
    return Math.max(op.index, index - op.length);
  } else {
    return index;
  }
}

export function mapTextIndexThroughOperations(
  index: number,
  ops: readonly TextOperation[]
): number {
  let mapped = index;
  for (const op of ops) {
    mapped = mapIndexThroughOperation(mapped, op);
  }
  return mapped;
}

/**
 * Inverse of {@link mapIndexThroughOperation}: given an index in the
 * document *after* `op` was applied, return an equivalent index in the
 * document *before* it was applied.
 *
 * At ambiguous boundaries this picks the conventional inverse of
 * {@link mapIndexThroughOperation}:
 * - For an insert, positions inside the inserted range collapse to the
 *   left edge (the original insertion point).
 * - For a delete, a position at the deletion site is mapped to the right
 *   edge of where the deleted range used to be.
 */
function inverseMapIndexThroughOperation(
  index: number,
  op: TextOperation
): number {
  if (op.type === "insert") {
    if (index <= op.index) {
      return index;
    }
    return Math.max(op.index, index - op.text.length);
  } else if (op.type === "delete") {
    return op.index <= index ? index + op.length : index;
  } else {
    return index;
  }
}

/**
 * Inverse of {@link mapTextIndexThroughOperations}: given an index in the
 * document *after* `ops` were applied in order, return an equivalent index
 * in the document *before* any of them were applied. Inverts the ops in
 * reverse order.
 */
export function inverseMapTextIndexThroughOperations(
  index: number,
  ops: readonly TextOperation[]
): number {
  let mapped = index;
  for (let i = ops.length - 1; i >= 0; i--) {
    mapped = inverseMapIndexThroughOperation(mapped, ops[i]);
  }
  return mapped;
}

// -----------------------------------------------------------------------------
// Operational transform
// -----------------------------------------------------------------------------

/**
 * The position of the ops being transformed relative to the ops they are
 * transformed over, in the final (server-serialized) timeline:
 *
 * - "after": the transformed ops will be ordered after the `over` ops. Used
 *   when rebasing a not-yet-accepted op over already-accepted ops. On
 *   same-index insert ties, the transformed op shifts right (the earlier op
 *   stays left), and conflicting format attributes are kept (they will
 *   overwrite, since the op applies later).
 * - "before": the transformed ops were ordered before the `over` ops. Used
 *   when applying an accepted remote op on top of locally-pending ops. On
 *   same-index insert ties, the transformed op stays left, and conflicting
 *   format attributes are dropped on overlapping ranges (the later `over` op
 *   wins).
 */
export type TransformOrder = "before" | "after";

function oppositeOrder(order: TransformOrder): TransformOrder {
  return order === "before" ? "after" : "before";
}

function mapIndexOverDelete(
  index: number,
  deleteIndex: number,
  deleteLength: number
): number {
  if (deleteIndex >= index) {
    return index;
  }
  return Math.max(deleteIndex, index - deleteLength);
}

/**
 * Transform a single insert op over a single op. Both ops must be expressed
 * against the same document state.
 */
function transformInsert(
  op: TextOperation & { type: "insert" },
  over: TextOperation,
  order: TransformOrder
): TextOperation[] {
  if (over.type === "insert") {
    const shifts =
      over.index < op.index || (over.index === op.index && order === "after");
    return [shifts ? { ...op, index: op.index + over.text.length } : { ...op }];
  } else if (over.type === "delete") {
    return [
      { ...op, index: mapIndexOverDelete(op.index, over.index, over.length) },
    ];
  } else {
    return [{ ...op }];
  }
}

/**
 * Transform a single delete op over a single op. A delete spanning a
 * concurrent insert is split into two deletes so the inserted text survives.
 * The returned ops use sequential application semantics (each op applies to
 * the result of the previous one).
 */
function transformDelete(
  op: TextOperation & { type: "delete" },
  over: TextOperation
): TextOperation[] {
  const start = op.index;
  const end = op.index + op.length;

  if (over.type === "insert") {
    const at = over.index;
    const len = over.text.length;
    if (at <= start) {
      return [{ ...op, index: start + len }];
    }
    if (at >= end) {
      return [{ ...op }];
    }
    // The insert lands strictly inside the deleted range: split the delete so
    // the concurrently inserted text is preserved. After the first piece is
    // applied, the inserted text sits at `start`, and the remainder of the
    // original range sits right after it.
    return [
      { type: "delete", index: start, length: at - start },
      { type: "delete", index: start + len, length: end - at },
    ];
  } else if (over.type === "delete") {
    const newStart = mapIndexOverDelete(start, over.index, over.length);
    const newEnd = mapIndexOverDelete(end, over.index, over.length);
    return newEnd - newStart > 0
      ? [{ type: "delete", index: newStart, length: newEnd - newStart }]
      : [];
  } else {
    return [{ ...op }];
  }
}

/**
 * Transform a single format op over a single op. Like deletes, a format
 * spanning a concurrent insert is split so the inserted text is not formatted.
 * For overlapping concurrent formats, the op that is ordered later in the
 * final timeline wins conflicting attribute keys: when `order` is "before",
 * the transformed op drops the keys that `over` also sets on the overlapping
 * range.
 */
function transformFormat(
  op: TextOperation & { type: "format" },
  over: TextOperation,
  order: TransformOrder
): TextOperation[] {
  const start = op.index;
  const end = op.index + op.length;

  if (over.type === "insert") {
    const at = over.index;
    const len = over.text.length;
    if (at <= start) {
      return [{ ...op, index: start + len }];
    }
    if (at >= end) {
      return [{ ...op }];
    }
    return [
      {
        type: "format",
        index: start,
        length: at - start,
        attributes: op.attributes,
      },
      {
        type: "format",
        index: at + len,
        length: end - at,
        attributes: op.attributes,
      },
    ];
  } else if (over.type === "delete") {
    const newStart = mapIndexOverDelete(start, over.index, over.length);
    const newEnd = mapIndexOverDelete(end, over.index, over.length);
    return newEnd - newStart > 0
      ? [
          {
            type: "format",
            index: newStart,
            length: newEnd - newStart,
            attributes: op.attributes,
          },
        ]
      : [];
  } else {
    if (order === "after") {
      // This op applies later and naturally overwrites; nothing to do.
      return [{ ...op }];
    }

    const overlapStart = Math.max(start, over.index);
    const overlapEnd = Math.min(end, over.index + over.length);
    if (overlapStart >= overlapEnd) {
      return [{ ...op }];
    }

    const hasConflict = Object.keys(op.attributes).some(
      (key) => key in over.attributes
    );
    if (!hasConflict) {
      return [{ ...op }];
    }

    const reduced: JsonObject = {};
    for (const [key, value] of Object.entries(op.attributes)) {
      if (!(key in over.attributes)) {
        reduced[key] = value;
      }
    }

    const pieces: TextOperation[] = [];
    if (start < overlapStart) {
      pieces.push({
        type: "format",
        index: start,
        length: overlapStart - start,
        attributes: op.attributes,
      });
    }
    if (Object.keys(reduced).length > 0) {
      pieces.push({
        type: "format",
        index: overlapStart,
        length: overlapEnd - overlapStart,
        attributes: reduced,
      });
    }
    if (overlapEnd < end) {
      pieces.push({
        type: "format",
        index: overlapEnd,
        length: end - overlapEnd,
        attributes: op.attributes,
      });
    }
    return pieces;
  }
}

function transformSingle(
  op: TextOperation,
  over: TextOperation,
  order: TransformOrder
): TextOperation[] {
  switch (op.type) {
    case "insert":
      return transformInsert(op, over, order);
    case "delete":
      return transformDelete(op, over);
    case "format":
      return transformFormat(op, over, order);
  }
}

/**
 * Transform op sequence A against op sequence B, where both sequences are
 * expressed against the same base document state and each sequence uses
 * sequential application semantics internally.
 *
 * Returns [A', B'] such that:
 * - A' is A transformed to apply after B (i.e. against base ⊕ B), and
 * - B' is B transformed to apply after A (i.e. against base ⊕ A),
 * and base ⊕ A ⊕ B' === base ⊕ B ⊕ A' (TP1).
 *
 * `order` is A's position relative to B in the final timeline.
 */
export function transformTextOperationsX(
  a: readonly TextOperation[],
  b: readonly TextOperation[],
  order: TransformOrder
): [TextOperation[], TextOperation[]] {
  if (a.length === 0 || b.length === 0) {
    return [[...a], [...b]];
  }

  if (a.length === 1 && b.length === 1) {
    return [
      transformSingle(a[0], b[0], order),
      transformSingle(b[0], a[0], oppositeOrder(order)),
    ];
  }

  if (a.length > 1) {
    const [headA1, b1] = transformTextOperationsX([a[0]], b, order);
    const [restA1, b2] = transformTextOperationsX(a.slice(1), b1, order);
    return [[...headA1, ...restA1], b2];
  }

  const [a1, headB1] = transformTextOperationsX(a, [b[0]], order);
  const [a2, restB1] = transformTextOperationsX(a1, b.slice(1), order);
  return [a2, [...headB1, ...restB1]];
}

/**
 * Transform `ops` over `over` (see {@link transformTextOperationsX}),
 * returning only the transformed `ops`.
 */
export function transformTextOperations(
  ops: readonly TextOperation[],
  over: readonly TextOperation[],
  order: TransformOrder
): TextOperation[] {
  return transformTextOperationsX(ops, over, order)[0];
}

/**
 * Structural equality of two operation sequences (order-insensitive for
 * attribute keys).
 */
export function textOperationsEqual(
  a: readonly TextOperation[],
  b: readonly TextOperation[]
): boolean {
  return a === b || stableStringify(a) === stableStringify(b);
}

export function applyTextOperationsToSegments(
  segments: readonly TextSegment[],
  ops: readonly TextOperation[]
): TextSegment[] {
  let next = [...segments];

  for (const op of ops) {
    if (op.type === "insert") {
      const index = Math.max(0, Math.min(op.index, textLength(next)));
      next = applyInsert(next, index, op.text, op.attributes);
    } else if (op.type === "delete") {
      const index = Math.max(0, Math.min(op.index, textLength(next)));
      const clipped = clipRange(index, op.length, textLength(next));
      next = applyDelete(next, clipped.index, clipped.length).segments;
    } else {
      const index = Math.max(0, Math.min(op.index, textLength(next)));
      const clipped = clipRange(index, op.length, textLength(next));
      next = applyFormat(next, clipped.index, clipped.length, op.attributes);
    }
  }

  return next;
}

export function applyLiveTextOperations(
  data: LiveTextData,
  ops: readonly TextOperation[]
): LiveTextData {
  return segmentsToData(
    applyTextOperationsToSegments(dataToSegments(data), ops)
  );
}

export function invertTextOperations(
  segments: readonly TextSegment[],
  ops: readonly TextOperation[]
): TextOperation[] {
  let shadow = [...segments];
  const reverse: TextOperation[] = [];

  for (const op of ops) {
    if (op.type === "insert") {
      shadow = applyInsert(shadow, op.index, op.text, op.attributes);
      reverse.unshift({
        type: "delete",
        index: op.index,
        length: op.text.length,
      });
    } else if (op.type === "delete") {
      const deletedSegments = extractDeletedSegments(
        shadow,
        op.index,
        op.length
      );
      shadow = applyDelete(shadow, op.index, op.length).segments;
      const inserts: TextOperation[] = [];
      let insertIndex = op.index;
      for (const segment of deletedSegments) {
        inserts.push({
          type: "insert",
          index: insertIndex,
          text: segment.text,
          attributes: segment.attributes,
        });
        insertIndex += segment.text.length;
      }
      for (let index = inserts.length - 1; index >= 0; index--) {
        reverse.unshift(inserts[index]);
      }
    } else {
      const inverse = formatReverseOperations(
        shadow,
        op.index,
        op.length,
        op.attributes
      );
      shadow = applyFormat(shadow, op.index, op.length, op.attributes);
      reverse.unshift(...inverse.reverse());
    }
  }

  return reverse;
}
