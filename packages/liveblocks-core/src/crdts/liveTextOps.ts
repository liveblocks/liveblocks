import { freeze } from "../lib/freeze";
import type { Json, JsonObject } from "../lib/Json";
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

export function rebaseTextOperations(
  ops: readonly TextOperation[],
  acceptedOps: readonly TextOperation[]
): TextOperation[] {
  return ops.map((op) => {
    if (op.type === "insert") {
      return {
        ...op,
        index: mapTextIndexThroughOperations(op.index, acceptedOps),
      };
    } else if (op.type === "delete" || op.type === "format") {
      const start = mapTextIndexThroughOperations(op.index, acceptedOps);
      const end = mapTextIndexThroughOperations(
        op.index + op.length,
        acceptedOps
      );
      return { ...op, index: start, length: Math.max(0, end - start) };
    } else {
      return op;
    }
  });
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
