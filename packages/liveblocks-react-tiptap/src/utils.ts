import type { ClientRectObject } from "@floating-ui/react-dom";
import type { ContextualPromptContext } from "@liveblocks/core";
import type { Editor, Range } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import {
  type EditorState,
  type Selection,
  TextSelection,
} from "@tiptap/pm/state";
import {
  getRelativeSelection,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import type { RelativePosition } from "yjs";

import type { TiptapMentionData, YSyncPluginState } from "./types";
import {
  LIVEBLOCKS_GROUP_MENTION_TYPE,
  LIVEBLOCKS_MENTION_TYPE,
} from "./types";

const CONTEXT_TRUNCATION = "[…]";
const CONTEXT_BLOCK_SEPARATOR = "\n";

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
): Map<string, TiptapMentionData> => {
  const mentions = new Map<string, TiptapMentionData>();

  node.nodesBetween(range.from, range.to, (child) => {
    if (
      child.type.name === LIVEBLOCKS_MENTION_TYPE ||
      child.type.name === LIVEBLOCKS_GROUP_MENTION_TYPE
    ) {
      const mention = child.attrs as Omit<TiptapMentionData, "kind">;

      if (mention.id && mention.notificationId) {
        mentions.set(mention.notificationId, {
          kind:
            child.type.name === LIVEBLOCKS_GROUP_MENTION_TYPE
              ? "group"
              : "user",
          id: mention.id,
          userIds: mention.userIds,
          notificationId: mention.notificationId,
        } as TiptapMentionData);
      }
    }
  });

  return mentions;
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

export function getDomRangeFromSelection(editor: Editor, selection: Selection) {
  if (selection.from === selection.to) {
    const { parent, parentOffset } = selection.$from;

    // If the selection is collapsed and in an empty block node or at the end
    // of a text node, extend it to the entire node
    if (
      (parent.isBlock && parent.content.size === 0) ||
      (parent.isTextblock && parentOffset === parent.content.size)
    ) {
      selection = TextSelection.create(
        editor.state.doc,
        selection.$from.before(),
        selection.$from.after()
      );
    }
  }

  const from = editor.view.domAtPos(selection.from);
  const to = editor.view.domAtPos(selection.to);

  const domRange = document.createRange();
  domRange.setStart(from.node, from.offset);
  domRange.setEnd(to.node, to.offset);

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

export function getContextualPromptContext(
  editor: Editor,
  maxLength = 10_000
): ContextualPromptContext {
  const { selection, doc } = editor.state;

  const selectionLength = selection.to - selection.from;

  if (maxLength >= doc.content.size) {
    // If the document is smaller than the maximum length, return the entire document
    return {
      beforeSelection: doc.textBetween(
        0,
        selection.from,
        CONTEXT_BLOCK_SEPARATOR
      ),
      selection: doc.textBetween(
        selection.from,
        selection.to,
        CONTEXT_BLOCK_SEPARATOR
      ),
      afterSelection: doc.textBetween(
        selection.to,
        doc.content.size,
        CONTEXT_BLOCK_SEPARATOR
      ),
    };
  } else if (selectionLength > maxLength) {
    // If the selection is too large, truncate its middle to still allow continuations
    const selectionStart = doc.textBetween(
      selection.from,
      selection.from + Math.floor(maxLength / 2) - CONTEXT_TRUNCATION.length,
      CONTEXT_BLOCK_SEPARATOR
    );
    const selectionEnd = doc.textBetween(
      selection.to - Math.floor(maxLength / 2) + CONTEXT_TRUNCATION.length,
      selection.to,
      CONTEXT_BLOCK_SEPARATOR
    );

    return {
      beforeSelection: "",
      selection: `${selectionStart}${CONTEXT_TRUNCATION}${selectionEnd}`,
      afterSelection: "",
    };
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

    let beforeSelection = doc.textBetween(
      Math.max(0, selection.from - beforeLength),
      selection.from,
      CONTEXT_BLOCK_SEPARATOR
    );
    let afterSelection = doc.textBetween(
      selection.to,
      Math.min(doc.content.size, selection.to + afterLength),
      CONTEXT_BLOCK_SEPARATOR
    );

    // Add leading truncation if `beforeSelection` doesn't contain the document's start
    if (selection.from - beforeLength > 0) {
      beforeSelection = `${CONTEXT_TRUNCATION}${beforeSelection}`;
    }

    // Add trailing truncation if `afterSelection` doesn't contain the document's end
    if (selection.to + afterLength < doc.content.size) {
      afterSelection = `${afterSelection}${CONTEXT_TRUNCATION}`;
    }

    return {
      beforeSelection,
      selection: doc.textBetween(
        selection.from,
        selection.to,
        CONTEXT_BLOCK_SEPARATOR
      ),
      afterSelection,
    };
  }
}
