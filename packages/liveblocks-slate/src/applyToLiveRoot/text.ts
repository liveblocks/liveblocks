import { assert } from "@liveblocks/core";
import type { InsertTextOperation, RemoveTextOperation } from "slate";

import type { LiveRoot } from "../types";
import { isLiveText } from "../types";
import { getLiveNode } from "../utils/getLiveNode";

export function handleInsertText(
  liveRoot: LiveRoot,
  op: InsertTextOperation
): void {
  const { path, offset, text } = op;
  const liveTarget = getLiveNode(liveRoot, path);

  assert(
    isLiveText(liveTarget),
    "Cannot apply text operation to non live text"
  );

  const currentText = liveTarget.get("text");
  const textBefore = currentText.slice(0, offset);
  const textAfter = currentText.slice(offset);
  liveTarget.set("text", textBefore + text + textAfter);
}

export function handleRemoveText(
  liveRoot: LiveRoot,
  op: RemoveTextOperation
): void {
  const { path, offset, text } = op;
  const liveTarget = getLiveNode(liveRoot, path);

  assert(
    isLiveText(liveTarget),
    "Cannot apply text operation to non live text"
  );

  const currentText = liveTarget.get("text");
  const textBefore = currentText.slice(0, offset);
  const textAfter = currentText.slice(offset + text.length);
  liveTarget.set("text", textBefore + textAfter);
}
