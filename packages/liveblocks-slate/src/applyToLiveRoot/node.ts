import { LiveList, LiveObject } from "@liveblocks/client";
import { assert, nn } from "@liveblocks/core";
import type {
  InsertNodeOperation,
  MergeNodeOperation,
  MoveNodeOperation,
  RemoveNodeOperation,
  SetNodeOperation,
  SplitNodeOperation,
} from "slate";
import { Editor, Path } from "slate";

import { FORBIDDEN_SET_PROPERTIES } from "../constants";
import type { LiveRoot, LsonElement, LsonText } from "../types";
import { isLiveElement, isLiveRoot, isLiveText } from "../types";
import {
  cloneLiveDescendant,
  slateDescendantToLiveDescendant,
} from "../utils/convert";
import { getLiveChildren } from "../utils/getLiveChildren";
import { getLiveNode } from "../utils/getLiveNode";

export function handleInsertNode(
  liveRoot: LiveRoot,
  op: InsertNodeOperation
): void {
  const { path, node } = op;

  assert(path.length > 0, "Cannot insert as live root");
  assert(!Editor.isEditor(node), "Cannot insert editor as node");

  const offset = nn(path[path.length - 1]);
  const targetPath = path.slice(0, -1);
  const liveTarget = getLiveNode(liveRoot, targetPath);
  const liveInsertNode = slateDescendantToLiveDescendant(node);

  if (isLiveRoot(liveTarget)) {
    liveTarget.insert(liveInsertNode, offset);
    return;
  }

  assert(!isLiveText(liveTarget), "Cannot insert node into live text");

  liveTarget.get("children").insert(liveInsertNode, offset);
}

export function handleRemoveNode(
  liveRoot: LiveRoot,
  op: RemoveNodeOperation
): void {
  const { path } = op;
  assert(path.length > 0, "Cannot remove live root");

  const offset = nn(path[path.length - 1]);
  const targetPath = path.slice(0, -1);
  const liveTarget = getLiveNode(liveRoot, targetPath);

  if (isLiveRoot(liveTarget)) {
    liveTarget.delete(offset);
    return;
  }

  assert(!isLiveText(liveTarget), "Cannot remove node from live text");

  liveTarget.get("children").delete(offset);
}

export function handleSetNode(liveRoot: LiveRoot, op: SetNodeOperation): void {
  const { path, properties, newProperties } = op;

  const targetLiveNode = getLiveNode(liveRoot, path);

  assert(!isLiveRoot(targetLiveNode), "Cannot set properties of live root");

  const patch: Partial<LsonText> & Partial<LsonElement> = {};
  Object.entries(newProperties).forEach(([key, value]) => {
    assert(!FORBIDDEN_SET_PROPERTIES.has(key), `Cannot set property "${key}"`);

    if (value === null) {
      return targetLiveNode.delete(key as keyof typeof newProperties);
    }

    // @ts-expect-error - TODO: fix this
    patch[key] = value;
  });

  targetLiveNode.update(patch);

  Object.keys(properties).forEach((key) => {
    assert(
      !FORBIDDEN_SET_PROPERTIES.has(key),
      `Cannot unset property "${key}"`
    );

    if (!Object.hasOwnProperty.call(newProperties, key)) {
      targetLiveNode.delete(key as keyof typeof properties);
    }
  });
}

export function handleMoveNode(
  liveRoot: LiveRoot,
  op: MoveNodeOperation
): void {
  const { path, newPath } = op;
  assert(
    !Path.isAncestor(path, newPath),
    `Cannot move a path [${path}] to new path [${newPath}] because the destination is inside itself.`
  );

  assert(path.length > 0 && newPath.length > 0, "Cannot move (onto) live root");

  // This is tricky, but since the `path` and `newPath` both refer to
  // the same snapshot in time, there's a mismatch. After removing the
  // original position, the second step's path can be out of date. So
  // instead of using the `op.newPath` directly, we transform `op.path`
  // to ascertain what the the actual path of the node would be after
  // the operation was applied.
  const truePath = nn(
    Path.transform(path, op),
    // This should never happen since move_node transforms never result in a null path
    "Path transform by node operation resulted in a null path"
  );

  // Move of a node within the same parent, we can leverage liveblocks native
  // move operation.
  if (Path.isSibling(path, newPath)) {
    const targetPath = path.slice(0, -1);
    const liveTarget = getLiveNode(liveRoot, targetPath);
    const fromIdx = nn(path[path.length - 1]);
    const toIdx = nn(truePath[truePath.length - 1]);
    if (isLiveRoot(liveTarget)) {
      liveTarget.move(fromIdx, toIdx);
      return;
    }

    assert(!isLiveText(liveTarget), "Cannot move node into live text");

    liveTarget.get("children").move(fromIdx, toIdx);
    return;
  }

  // Move of a node to a new parent, we need to remove the node from its
  // original parent and insert it into the new parent.
  const movedNode = getLiveNode(liveRoot, path);

  assert(!isLiveRoot(movedNode), "Cannot move live root");

  const fromParentPath = path.slice(0, -1);
  const fromParent = getLiveNode(liveRoot, fromParentPath);
  const fromIdx = nn(path[path.length - 1]);

  assert(!isLiveText(fromParent), "Cannot move node out of live text");

  getLiveChildren(fromParent).delete(fromIdx);

  const toParentPath = truePath.slice(0, -1);
  const toParent = getLiveNode(liveRoot, toParentPath);
  const toIdx = nn(truePath[truePath.length - 1]);

  assert(!isLiveText(toParent), "Cannot move node into live text");

  getLiveChildren(toParent).insert(cloneLiveDescendant(movedNode), toIdx);
}

export function handleMergeNode(
  liveRoot: LiveRoot,
  op: MergeNodeOperation
): void {
  const { path } = op;
  const toRemove = getLiveNode(liveRoot, path);
  const liveTarget = getLiveNode(liveRoot, Path.previous(path));

  assert(
    !isLiveRoot(liveTarget) && !isLiveRoot(toRemove),
    "Cannot merge live root"
  );

  const liveParent = getLiveNode(liveRoot, Path.parent(path));
  assert(!isLiveText(liveParent), "Cannot merge children of live text");

  if (isLiveText(liveTarget) && isLiveText(toRemove)) {
    liveTarget.set("text", liveTarget.get("text") + toRemove.get("text"));
  } else if (isLiveElement(liveTarget) && isLiveElement(toRemove)) {
    toRemove.get("children").forEach((child) => {
      liveTarget.get("children").push(cloneLiveDescendant(child));
    });
  } else {
    assert(false, "Cannot merge nodes of different types");
  }

  const removeIdx = nn(path[path.length - 1]);
  getLiveChildren(liveParent).delete(removeIdx);
}

export function handleSplitNode(root: LiveRoot, op: SplitNodeOperation): void {
  const { path, position, properties } = op;
  const liveTarget = getLiveNode(root, path);

  assert(!isLiveRoot(liveTarget), "Cannot split live root");

  const liveParent = getLiveNode(root, Path.parent(path));

  assert(!isLiveText(liveParent), "Cannot split children of live text");

  if (isLiveText(liveTarget)) {
    const text = liveTarget.get("text");
    liveTarget.set("text", text.slice(0, position));

    const newText = new LiveObject<LsonText>({
      ...(properties as Partial<Text>),
      text: text.slice(position),
    });

    getLiveChildren(liveParent).insert(newText, nn(path[path.length - 1]) + 1);
    return;
  }

  const children = liveTarget.get("children");
  const newChildren: LiveRoot = new LiveList();
  for (let i = children.length - 1; i >= position; i--) {
    const liveNode = nn(children.get(i), `Cannot get live node at index ${i}`);
    children.delete(i);
    newChildren.insert(cloneLiveDescendant(liveNode), 0);
  }

  const newElement = new LiveObject<LsonElement>({
    ...(properties as Partial<Element>),
    children: newChildren,
  });

  getLiveChildren(liveParent).insert(newElement, nn(path[path.length - 1]) + 1);
}
