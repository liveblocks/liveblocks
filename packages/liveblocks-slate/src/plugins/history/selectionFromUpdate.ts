import type { StorageUpdate } from "@liveblocks/core";
import { Editor, Node, Range } from "slate";
import { isLiveText, LiveRoot } from "../../types";
import { getDiffOffsets } from "../../utils/diffText";
import { getSlatePath } from "../../utils/getSlatePath";

export function selectionFromUpdate(
  editor: Editor,
  liveRoot: LiveRoot,
  update: StorageUpdate
): Range | null {
  if (update.type !== "LiveObject") {
    return null;
  }

  const { updates, node: liveNode } = update;
  if (!("text" in updates) || !updates["text"] || !isLiveText(liveNode)) {
    return null;
  }

  const slatePath = getSlatePath(liveRoot, liveNode);
  const leaf = Node.leaf(editor, slatePath);

  const diff = getDiffOffsets(leaf.text, liveNode.get("text"));
  if (!diff) {
    return null;
  }

  const anchor = { path: slatePath, offset: diff.start };
  return { anchor, focus: anchor };
}
