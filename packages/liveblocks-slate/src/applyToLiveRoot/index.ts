import { assertNever } from "@liveblocks/core";
import type { Operation } from "slate";

import type { LiveRoot } from "../types";
import {
  handleInsertNode,
  handleMergeNode,
  handleMoveNode,
  handleRemoveNode,
  handleSetNode,
  handleSplitNode,
} from "./node";
import { handleInsertText, handleRemoveText } from "./text";

/**
 * Apply a slate operation to a live slate root.
 */
export function applySlateOperation(liveRoot: LiveRoot, op: Operation): void {
  switch (op.type) {
    case "set_node":
      return handleSetNode(liveRoot, op);
    case "insert_node":
      return handleInsertNode(liveRoot, op);
    case "remove_node":
      return handleRemoveNode(liveRoot, op);
    case "move_node":
      return handleMoveNode(liveRoot, op);
    case "merge_node":
      return handleMergeNode(liveRoot, op);
    case "split_node":
      return handleSplitNode(liveRoot, op);
    case "insert_text":
      return handleInsertText(liveRoot, op);
    case "remove_text":
      return handleRemoveText(liveRoot, op);

    // NOOP
    case "set_selection":
      return;

    default:
      assertNever(op, "Unexpected slate operation type");
  }
}
