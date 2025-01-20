import type { ClientRectObject } from "@floating-ui/react-dom";
import type { Editor, Range } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { Selection } from "@tiptap/pm/state";

import { LIVEBLOCKS_MENTION_TYPE } from "./types";

export const getRectFromCoords = (coords: {
  top: number;
  left: number;
  right: number;
  bottom: number;
}): ClientRectObject => {
  return {
    ...coords,
    x: coords.left,
    y: coords.top,
    width: coords.right - coords.left,
    height: coords.bottom - coords.top,
  };
};

export const getMentionsFromNode = (
  node: ProseMirrorNode,
  range: Range
): { notificationId: string; userId: string }[] => {
  const result: { notificationId: string; userId: string }[] = [];
  node.nodesBetween(range.from, range.to, (child) => {
    if (child.type.name === LIVEBLOCKS_MENTION_TYPE) {
      const mention = child.attrs as { id?: string; notificationId?: string };
      if (mention.id && mention.notificationId) {
        result.push({
          notificationId: mention.notificationId,
          userId: mention.id,
        });
      }
    }
  });
  return result;
};

// How to modify data in transformPasted, inspired by: https://discuss.prosemirror.net/t/modify-specific-node-on-copy-and-paste-in-clipboard/4901/4
export const mapFragment = (
  fragment: Fragment,
  callback: (
    node: ProseMirrorNode
  ) => ProseMirrorNode | ProseMirrorNode[] | Fragment | null
): Fragment => {
  const content: ProseMirrorNode[] = [];
  fragment.forEach((node) => {
    if (node.content.childCount > 0) {
      content.push(
        node.type.create(node.attrs, mapFragment(node.content, callback))
      );
      return;
    }
    content.push(callback(node) as ProseMirrorNode);
  });

  return Fragment.from(content);
};

export function getDomRangeFromSelection(selection: Selection, editor: Editor) {
  const { from, to } = selection;
  const fromPos = editor.view.domAtPos(from);
  const endPos = editor.view.domAtPos(to);

  const domRange = document.createRange();
  domRange.setStart(fromPos.node, fromPos.offset);
  domRange.setEnd(endPos.node, endPos.offset);

  return domRange;
}

export function compareSelections(
  a: Selection | null | undefined,
  b: Selection | null | undefined
) {
  if (!a || !b) {
    return false;
  }

  return a.eq(b);
}
