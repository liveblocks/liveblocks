import { kInternal } from "@liveblocks/core";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import {
  type Selection,
  type SelectionBookmark,
  TextSelection,
  type Transaction,
} from "prosemirror-state";

import {
  buildLiveblocksTreeIndex,
  findTextRangeAtPositionInDocument,
} from "./mapping";
import type { LiveblocksProsemirrorNode } from "./schema";

type HistorySelectionTextPoint = {
  encodedOffset: number;
  localOffset: number;
  nodeId: string;
  version: number;
};

type HistorySelectionPoint = {
  absolute: number;
  text?: HistorySelectionTextPoint;
};

export type HistorySelectionSnapshot = {
  anchor: HistorySelectionPoint;
  bookmark: SelectionBookmark;
  head: HistorySelectionPoint;
  isTextSelection: boolean;
};

function capturePoint(
  position: number,
  doc: ProseMirrorNode,
  liveRoot: LiveblocksProsemirrorNode
): HistorySelectionPoint {
  const range = findTextRangeAtPositionInDocument(doc, liveRoot, position);
  if (range === undefined) {
    return { absolute: position };
  }

  const localOffset =
    range.liveOffset +
    Math.max(0, Math.min(position - range.from, range.to - range.from));

  return {
    absolute: position,
    text: {
      encodedOffset: range.text[kInternal].encodeIndex(localOffset),
      localOffset,
      nodeId: range.nodeId,
      version: range.text.version,
    },
  };
}

export function captureHistorySelection(
  selection: Selection,
  doc: ProseMirrorNode,
  liveRoot: LiveblocksProsemirrorNode
): HistorySelectionSnapshot {
  return {
    anchor: capturePoint(selection.anchor, doc, liveRoot),
    bookmark: selection.getBookmark(),
    head: capturePoint(selection.head, doc, liveRoot),
    isTextSelection: selection instanceof TextSelection,
  };
}

function clampPosition(position: number, doc: ProseMirrorNode): number {
  return Math.max(0, Math.min(position, doc.content.size));
}

function resolveTextOffset(
  point: HistorySelectionPoint,
  doc: ProseMirrorNode,
  liveRoot: LiveblocksProsemirrorNode,
  preferLocalOffset: boolean
): number | undefined {
  if (point.text === undefined) {
    return undefined;
  }
  const textPoint = point.text;

  const index = buildLiveblocksTreeIndex(doc, liveRoot);
  const ranges = index.textRanges.filter(
    (range) => range.nodeId === textPoint.nodeId
  );
  const text = ranges[0]?.text;
  if (text === undefined) {
    return undefined;
  }

  const decodedOffset = preferLocalOffset
    ? textPoint.localOffset
    : text[kInternal].decodeIndex(textPoint.encodedOffset, textPoint.version);
  if (decodedOffset === null) {
    return undefined;
  }

  const offset = Math.max(0, Math.min(decodedOffset, text.length));
  const containingRange = ranges.find(
    (range) =>
      offset >= range.liveOffset &&
      offset <= range.liveOffset + (range.to - range.from)
  );
  const range = containingRange ?? ranges.at(-1);
  if (range === undefined) {
    return undefined;
  }

  return clampPosition(
    range.from +
      Math.max(0, Math.min(offset - range.liveOffset, range.to - range.from)),
    doc
  );
}

function resolvePoint(
  point: HistorySelectionPoint,
  doc: ProseMirrorNode,
  liveRoot: LiveblocksProsemirrorNode,
  preferLocalOffset: boolean
): number {
  return (
    resolveTextOffset(point, doc, liveRoot, preferLocalOffset) ??
    clampPosition(point.absolute, doc)
  );
}

export function restoreHistorySelection(
  tr: Transaction,
  liveRoot: LiveblocksProsemirrorNode,
  snapshot: HistorySelectionSnapshot,
  action: "undo" | "redo"
): Transaction {
  if (!snapshot.isTextSelection) {
    try {
      return tr.setSelection(snapshot.bookmark.resolve(tr.doc));
    } catch {
      return tr;
    }
  }

  // LiveText.decodeIndex intentionally maps a position at an insertion to its
  // right edge. When undo restores a deleted range, that would collapse both
  // endpoints to the end of the restored text. The local offsets describe the
  // document after the inverse has been applied, so they preserve that range.
  const preferLocalOffset =
    action === "undo" && snapshot.anchor.absolute !== snapshot.head.absolute;
  const anchor = resolvePoint(
    snapshot.anchor,
    tr.doc,
    liveRoot,
    preferLocalOffset
  );
  const head = resolvePoint(snapshot.head, tr.doc, liveRoot, preferLocalOffset);

  return tr.setSelection(
    TextSelection.between(tr.doc.resolve(anchor), tr.doc.resolve(head))
  );
}
