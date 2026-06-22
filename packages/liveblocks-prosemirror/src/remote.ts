import {
  type Json,
  type JsonObject,
  LiveObject,
  LiveText,
  type StorageUpdate,
} from "@liveblocks/client";
import { Fragment, type MarkType, type Schema, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import {
  buildLiveblocksTreeIndex,
  findListRangeByLiveList,
  findNodeRangeByLiveNode,
  findTextRangeByLiveText,
  getChildPosition,
} from "./mapping";
import {
  attributesToMarks,
  getLiveblocksNodeContent,
  getLiveblocksNodeText,
  type LiveblocksProsemirrorNode,
  liveblocksProsemirrorNodeToJsonNodes,
} from "./schema";

type RemoteApplyResult =
  | {
      type: "applied";
      tr: Transaction;
    }
  | {
      type: "unsupported";
    };

function getMarkType(schema: Schema, type: string): MarkType | undefined {
  return schema.marks[type];
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLiveblocksProsemirrorNode(
  value: unknown
): value is LiveblocksProsemirrorNode {
  return (
    value instanceof LiveObject &&
    typeof value.get("id") === "string" &&
    typeof value.get("type") === "string"
  );
}

function getLiveblocksNodeAttrs(
  node: LiveblocksProsemirrorNode
): JsonObject | undefined {
  const attrs = node.get("attrs");
  return isJsonObject(attrs) ? attrs : undefined;
}

function createSliceFromLiveblocksNode(
  schema: Schema,
  node: LiveblocksProsemirrorNode
): Slice {
  const nodes = liveblocksProsemirrorNodeToJsonNodes(node).map((jsonNode) =>
    schema.nodeFromJSON(jsonNode)
  );

  return new Slice(Fragment.fromArray(nodes), 0, 0);
}

function applyMarksFromAttributes(
  tr: Transaction,
  schema: Schema,
  from: number,
  to: number,
  attributes: Record<string, Json | null>
): void {
  const marks = attributesToMarks({ ...attributes });

  for (const mark of marks ?? []) {
    const markType = getMarkType(schema, mark.type);
    if (markType !== undefined) {
      tr.addMark(from, to, markType.create(mark.attrs));
    }
  }

  if (marks === undefined) {
    tr.removeMark(from, to);
  }
}

function findNodeRangeForLiveText(
  index: ReturnType<typeof buildLiveblocksTreeIndex>,
  text: LiveText
) {
  return index.nodeRanges.find(
    (range) => getLiveblocksNodeText(range.node) === text
  );
}

function collectCoveredDescendants(
  node: LiveblocksProsemirrorNode,
  coveredNodes: Set<unknown>
): void {
  coveredNodes.add(node);

  const text = getLiveblocksNodeText(node);
  if (text !== undefined) {
    coveredNodes.add(text);
  }

  const content = getLiveblocksNodeContent(node);
  if (content === undefined) {
    return;
  }

  coveredNodes.add(content);
  for (let index = 0; index < content.length; index++) {
    const child = content.get(index);
    if (child !== undefined) {
      collectCoveredDescendants(child, coveredNodes);
    }
  }
}

function getStructurallyCoveredNodes(
  updates: readonly StorageUpdate[]
): Set<unknown> {
  const coveredNodes = new Set<unknown>();

  for (const update of updates) {
    if (update.type !== "LiveList") {
      continue;
    }

    for (const change of update.updates) {
      if (
        (change.type === "insert" ||
          change.type === "set" ||
          change.type === "move") &&
        isLiveblocksProsemirrorNode(change.item)
      ) {
        collectCoveredDescendants(change.item, coveredNodes);
      }
    }
  }

  return coveredNodes;
}

export function applyRemoteStorageUpdates(
  view: EditorView,
  liveRoot: LiveblocksProsemirrorNode,
  updates: readonly StorageUpdate[]
): RemoteApplyResult {
  if (updates.length === 0) {
    return { type: "unsupported" };
  }

  let tr = view.state.tr;
  const structurallyCoveredNodes = getStructurallyCoveredNodes(updates);

  for (const update of updates) {
    if (structurallyCoveredNodes.has(update.node)) {
      continue;
    }

    if (update.type === "LiveText") {
      if (!(update.node instanceof LiveText)) {
        return { type: "unsupported" };
      }

      for (const change of update.updates) {
        const index = buildLiveblocksTreeIndex(tr.doc, liveRoot);
        const range = findTextRangeByLiveText(index, update.node);

        if (range === undefined && change.type === "delete") {
          const wrapperRange = findNodeRangeForLiveText(index, update.node);
          if (wrapperRange !== undefined) {
            const from = wrapperRange.from + change.index;
            tr = tr.delete(from, from + change.length);
            continue;
          }

          return { type: "unsupported" };
        }

        if (range === undefined) {
          return { type: "unsupported" };
        }

        const from = range.from + change.index - range.liveOffset;

        if (change.type === "insert") {
          tr = tr.insertText(change.text, from);
          if (change.attributes !== undefined) {
            applyMarksFromAttributes(
              tr,
              view.state.schema,
              from,
              from + change.text.length,
              change.attributes
            );
          }
        } else if (change.type === "delete") {
          tr = tr.delete(from, from + change.length);
        } else {
          applyMarksFromAttributes(
            tr,
            view.state.schema,
            from,
            from + change.length,
            change.attributes
          );
        }
      }

      continue;
    }

    if (update.type === "LiveList") {
      for (const change of update.updates) {
        const index = buildLiveblocksTreeIndex(tr.doc, liveRoot);
        const range = findListRangeByLiveList(index, update.node);
        if (range === undefined) {
          return { type: "unsupported" };
        }

        if (change.type === "insert") {
          if (!isLiveblocksProsemirrorNode(change.item)) {
            return { type: "unsupported" };
          }

          const pos = getChildPosition(range.pmNode, range.from, change.index);
          if (pos === undefined) {
            return { type: "unsupported" };
          }

          tr = tr.replace(
            pos,
            pos,
            createSliceFromLiveblocksNode(view.state.schema, change.item)
          );
        } else if (change.type === "delete") {
          const from = getChildPosition(range.pmNode, range.from, change.index);
          const to = getChildPosition(
            range.pmNode,
            range.from,
            change.index + 1
          );
          if (from === undefined || to === undefined) {
            return { type: "unsupported" };
          }

          tr = tr.delete(from, to);
        } else if (change.type === "set") {
          if (!isLiveblocksProsemirrorNode(change.item)) {
            return { type: "unsupported" };
          }

          const from = getChildPosition(range.pmNode, range.from, change.index);
          const to = getChildPosition(
            range.pmNode,
            range.from,
            change.index + 1
          );
          if (from === undefined || to === undefined) {
            return { type: "unsupported" };
          }

          tr = tr.replace(
            from,
            to,
            createSliceFromLiveblocksNode(view.state.schema, change.item)
          );
        } else {
          if (!isLiveblocksProsemirrorNode(change.item)) {
            return { type: "unsupported" };
          }

          const from = getChildPosition(
            range.pmNode,
            range.from,
            change.previousIndex
          );
          const to = getChildPosition(
            range.pmNode,
            range.from,
            change.previousIndex + 1
          );
          const rawInsertPos = getChildPosition(
            range.pmNode,
            range.from,
            change.index > change.previousIndex
              ? change.index + 1
              : change.index
          );
          if (
            from === undefined ||
            to === undefined ||
            rawInsertPos === undefined
          ) {
            return { type: "unsupported" };
          }

          const slice = createSliceFromLiveblocksNode(
            view.state.schema,
            change.item
          );
          tr = tr.delete(from, to);
          const insertPos = tr.mapping.map(rawInsertPos, -1);
          tr = tr.replace(insertPos, insertPos, slice);
        }
      }

      continue;
    }

    if (update.type === "LiveObject") {
      if (!isLiveblocksProsemirrorNode(update.node)) {
        return { type: "unsupported" };
      }

      const attrUpdate = update.updates.attrs;
      if (attrUpdate === undefined) {
        return { type: "unsupported" };
      }

      const index = buildLiveblocksTreeIndex(tr.doc, liveRoot);
      const range = findNodeRangeByLiveNode(index, update.node);
      if (range === undefined || range.pmNode.type.name === "doc") {
        return { type: "unsupported" };
      }

      tr = tr.setNodeMarkup(
        range.from,
        undefined,
        attrUpdate.type === "delete"
          ? null
          : getLiveblocksNodeAttrs(update.node)
      );

      continue;
    }

    return { type: "unsupported" };
  }

  return { type: "applied", tr };
}

export function applyRemoteLiveTextUpdates(
  view: EditorView,
  liveRoot: LiveblocksProsemirrorNode,
  updates: readonly StorageUpdate[]
): RemoteApplyResult {
  if (!updates.every((update) => update.type === "LiveText")) {
    return { type: "unsupported" };
  }

  return applyRemoteStorageUpdates(view, liveRoot, updates);
}
