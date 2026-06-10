/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { JsonObject, TextOperation } from "@liveblocks/core";

// =============================================================================
// !!! KEEP IN SYNC !!!
//
// This module is a verbatim copy of the operational-transform section of
// liveblocks-core/src/crdts/liveTextOps.ts. Client and server MUST run the
// exact same transform for LiveText replicas to converge; any change here
// must be mirrored there (and vice versa).
//
// TODO: Delete this copy and import `transformTextOperations` from
// @liveblocks/core directly, the next time a liveblocks-core version that
// exports it is published.
// =============================================================================

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
      transformSingle(a[0]!, b[0]!, order),
      transformSingle(b[0]!, a[0]!, oppositeOrder(order)),
    ];
  }

  if (a.length > 1) {
    const [headA1, b1] = transformTextOperationsX([a[0]!], b, order);
    const [restA1, b2] = transformTextOperationsX(a.slice(1), b1, order);
    return [[...headA1, ...restA1], b2];
  }

  const [a1, headB1] = transformTextOperationsX(a, [b[0]!], order);
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
