import type { StorageUpdate } from "@liveblocks/client";
import { assert, assertNever, nn } from "@liveblocks/core";
import type { Editor } from "slate";
import { Node, Text } from "slate";

import { FORBIDDEN_SET_PROPERTIES } from "../constants";
import type { LiveblocksEditor } from "../plugins/liveblocks/liveblocksEditor";
import type { LiveRoot } from "../types";
import { isLiveElement, isLiveRoot, isLiveText } from "../types";
import { lsonToSlateNode } from "../utils/convert";
import { getDiffTextOps } from "../utils/diffText";
import { getSlatePath } from "../utils/getSlatePath";

function applyLiveListUpdate(
  editor: Editor,
  liveRoot: LiveRoot,
  update: StorageUpdate & { type: "LiveList" }
) {
  const { node, updates } = update;
  assert(isLiveRoot(node), "Update to unexpected live list under root");
  const path = getSlatePath(liveRoot, node);

  return updates.forEach((update) => {
    const { type, index } = update;
    const slateNode = Node.get(editor, path);
    assert(
      !Text.isText(slateNode),
      "Mismatch between live and slate node type"
    );

    switch (type) {
      case "set":
        editor.apply({
          type: "remove_node",
          path: [...path, index],
          node: nn(
            slateNode.children[index],
            "Cannot remove out of bound node"
          ),
        });
        return editor.apply({
          type: "insert_node",
          path: [...path, index],
          node: lsonToSlateNode(update.item),
        });
      case "insert":
        return editor.apply({
          type: "insert_node",
          path: [...path, index],
          node: lsonToSlateNode(update.item),
        });
      case "move":
        return editor.apply({
          type: "move_node",
          path: [...path, update.previousIndex],
          newPath: [...path, index],
        });
      case "delete":
        return editor.apply({
          type: "remove_node",
          path: [...path, index],
          node: nn(
            slateNode.children[index],
            "Cannot remove out of bound node"
          ),
        });
      default:
        assertNever(type, `Unexpected live list update type: "${type}"`);
    }
  });
}

function applyLiveObjectUpdate(
  editor: Editor,
  liveRoot: LiveRoot,
  update: StorageUpdate & { type: "LiveObject" }
) {
  const { node: liveNode, updates } = update;

  assert(
    isLiveElement(liveNode) || isLiveText(liveNode),
    "Update to unexpected live object under root"
  );

  const path = getSlatePath(liveRoot, liveNode);
  const slateNode = Node.get(editor, path);

  const properties: Partial<Node> = {};
  const newProperties: Partial<Node> = {};
  Object.keys(updates).forEach((key) => {
    if (key === "text" && isLiveText(liveNode)) {
      assert(
        Text.isText(slateNode),
        "Mismatch between live and slate node type"
      );

      getDiffTextOps(path, slateNode.text, liveNode.get("text")).forEach((op) =>
        editor.apply(op)
      );
      return;
    }

    assert(
      !FORBIDDEN_SET_PROPERTIES.has(key),
      `Cannot (un-)set property "${key}"`
    );

    if (key in slateNode) {
      // @ts-expect-error - TODO: fix this
      properties[key] = slateNode[key];
    }

    // @ts-expect-error - TODO: fix this
    const newValue = liveNode.get(key);

    // In slate setting a property to null or undefined is the same as removing it
    if (newValue !== null && newValue !== undefined) {
      // @ts-expect-error - TODO: fix this
      newProperties[key] = newValue;
    }
  });

  if (Object.keys(newProperties).length || Object.keys(properties).length) {
    editor.apply({ type: "set_node", properties, newProperties, path });
  }
}

function applyStorageUpdate(
  editor: Editor,
  liveRoot: LiveRoot,
  update: StorageUpdate
) {
  switch (update.type) {
    case "LiveList":
      return applyLiveListUpdate(editor, liveRoot, update);
    case "LiveObject":
      return applyLiveObjectUpdate(editor, liveRoot, update);
    default:
      throw new Error(`Unexpected storage update type: "${update.type}"`);
  }
}

export function applyStorageUpdates(
  editor: LiveblocksEditor,
  updates: StorageUpdate[]
): void {
  updates.forEach((update) =>
    applyStorageUpdate(editor, editor.liveRoot, update)
  );
}
