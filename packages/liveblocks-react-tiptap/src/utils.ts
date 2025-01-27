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

const GET_DOCUMENT_TEXT_TRUNCATION = "[…]";

/**
 * Get the document text up to a maximum length while making sure
 * the selection is always included.
 */
export function getDocumentText(editor: Editor, maxLength = 10_000) {
  const { selection, doc } = editor.state;

  const selectionLength = selection.to - selection.from;

  if (maxLength >= doc.content.size) {
    // If the document is smaller than the maximum length, return the entire document
    return doc.textBetween(0, doc.content.size, " ");
  } else if (selectionLength > maxLength) {
    // If the selection is too large, truncate its middle to still allow continuations
    const selectionStart = doc.textBetween(
      selection.from,
      selection.from +
        Math.floor(maxLength / 2) -
        GET_DOCUMENT_TEXT_TRUNCATION.length,
      " "
    );
    const selectionEnd = doc.textBetween(
      selection.to -
        Math.floor(maxLength / 2) +
        GET_DOCUMENT_TEXT_TRUNCATION.length,
      selection.to,
      " "
    );

    return `${selectionStart}${GET_DOCUMENT_TEXT_TRUNCATION}${selectionEnd}`;
  } else {
    // If the selection is smaller than (or equal to) the maximum length, extract as much as possible from the document around the selection

    // Start by taking as much as possible after the selection
    let beforeLength = Math.min(
      selection.from,
      Math.floor((maxLength - selectionLength) / 2)
    );
    const afterLength = Math.min(
      doc.content.size - selection.to,
      maxLength - selectionLength - beforeLength
    );

    // If needed (e.g. the selection is near the end), compensate before the selection
    if (beforeLength + afterLength + selectionLength < maxLength) {
      beforeLength = Math.min(
        selection.from,
        maxLength - selectionLength - afterLength
      );
    }

    // TODO: Find the closest word boundaries to avoid starting/stopping in the middle of a word?
    return doc.textBetween(
      Math.max(0, selection.from - beforeLength),
      Math.min(doc.content.size, selection.to + afterLength),
      " "
    );
  }
}
