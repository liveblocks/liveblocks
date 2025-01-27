import type { ClientRectObject } from "@floating-ui/react-dom";
import type { Editor, Range } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { EditorState, Selection } from "@tiptap/pm/state";
import {
  getRelativeSelection,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import type { RelativePosition } from "yjs";

import type { YSyncPluginState } from "./types";
import { LIVEBLOCKS_MENTION_TYPE } from "./types";

export const getRelativeSelectionFromState = (state: EditorState) => {
  const pluginState = ySyncPluginKey.getState(state) as YSyncPluginState;
  if (!pluginState) return null;
  return getRelativeSelection(pluginState.binding, state);
};

export const getRangeFromRelativeSelections = (
  pos: { anchor: RelativePosition; head: RelativePosition },
  state: EditorState
) => {
  const pluginState = ySyncPluginKey.getState(state) as YSyncPluginState;
  if (!pluginState || !pluginState.binding) return { from: 0, to: 0 };
  const { doc, type, mapping } = pluginState.binding;
  const anchor =
    relativePositionToAbsolutePosition(doc, type, pos.anchor, mapping) ?? 0;
  const head =
    relativePositionToAbsolutePosition(doc, type, pos.head, mapping) ?? 0;

  const from = anchor > head ? head : anchor;
  const to = anchor > head ? anchor : head;
  return { from, to };
};

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

export function getDomRange(editor: Editor, range: Range) {
  const { from, to } = range;
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

/**
 * Get the document text up to a maximum length while making sure
 * the selection is always included.
 */
export function getDocumentText(editor: Editor, maxLength = 10_000) {
  const { selection } = editor.state;

  const lengthSelection = selection.to - selection.from;

  // If the selection is too large, return as much of it as possible
  // TODO: This won't work for continuations, etc, but is there a better way? Truncating the middle of the selection?
  if (lengthSelection > maxLength) {
    return editor.state.doc.textBetween(
      selection.from,
      selection.from + maxLength,
      " "
    );
  }

  const lengthBeforeSelection = selection.from;
  const lengthAfterSelection = editor.state.doc.content.size - selection.to;

  // Compensate when some length is truncated by the document size
  const availableLengthOutsideSelection =
    Math.max(0, maxLength - lengthSelection) / 2;
  const unusedLengthBeforeSelection =
    availableLengthOutsideSelection > lengthBeforeSelection
      ? availableLengthOutsideSelection - lengthBeforeSelection
      : 0;
  const unusedLengthAfterSelection =
    availableLengthOutsideSelection > lengthAfterSelection
      ? availableLengthOutsideSelection - lengthAfterSelection
      : 0;

  // TODO: Find the closest word boundaries to avoid starting/stopping in the middle of a word
  return editor.state.doc.textBetween(
    Math.max(
      0,
      selection.from -
        (availableLengthOutsideSelection + unusedLengthAfterSelection)
    ),
    Math.min(
      selection.to + unusedLengthBeforeSelection,
      editor.state.doc.content.size
    ),
    " "
  );
}
