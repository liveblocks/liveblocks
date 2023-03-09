import type { StorageUpdate } from "@liveblocks/core";
import type { Editor, Range } from "slate";
import { Node } from "slate";

import type { LiveRoot } from "../../types";
import { isLiveText } from "../../types";
import { getDiffOffsets } from "../../utils/diffText";
import { getSlatePath } from "../../utils/getSlatePath";

// TODO: Handle more than just text updates
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
