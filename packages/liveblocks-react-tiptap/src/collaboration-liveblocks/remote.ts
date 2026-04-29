import { type Json, LiveText, type StorageUpdate } from "@liveblocks/client";
import type { MarkType, Schema } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

import {
  buildLiveblocksTreeIndex,
  findTextRangeByLiveText,
} from "./mapping";
import { attributesToMarks, type LiveblocksTiptapNode } from "./schema";

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

export function applyRemoteLiveTextUpdates(
  view: EditorView,
  liveRoot: LiveblocksTiptapNode,
  updates: readonly StorageUpdate[]
): RemoteApplyResult {
  if (!updates.every((update) => update.type === "LiveText")) {
    return { type: "unsupported" };
  }

  let tr = view.state.tr;
  let index = buildLiveblocksTreeIndex(tr.doc, liveRoot);

  for (const update of updates) {
    if (!(update.node instanceof LiveText)) {
      return { type: "unsupported" };
    }

    for (const change of update.updates) {
      const range = findTextRangeByLiveText(index, update.node);
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

      index = buildLiveblocksTreeIndex(tr.doc, liveRoot);
    }
  }

  return { type: "applied", tr };
}
