import type { Node as SlateNode } from "slate";
import {
  Editor as SlateEditor,
  Element as SlateElement,
  Range as SlateRange,
  Transforms as SlateTransforms,
} from "slate";

import type { ComposerBodyMention } from "../../types";
import { getMatchRange } from "../utils/get-match-range";
import { getPreviousCharacter } from "../utils/get-previous-character";
import { isSelectionCollapsed } from "../utils/is-selection-collapsed";

export const MENTION_CHARACTER = "@";

export type MentionDraft = {
  range: SlateRange;
  text: string;
};

export function getMentionDraftAtSelection(
  editor: SlateEditor
): MentionDraft | undefined {
  const { selection } = editor;

  if (!isSelectionCollapsed(selection)) {
    return;
  }

  const match = getMatchRange(editor, selection, [MENTION_CHARACTER]);

  console.log(match, match ? SlateEditor.string(editor, match) : undefined);

  if (!match) {
    return;
  }

  const mentionCharacter = getPreviousCharacter(editor, match);

  // Check if the match is preceded by the mention character
  if (!mentionCharacter || mentionCharacter.text !== MENTION_CHARACTER) {
    return;
  }

  return {
    range: SlateEditor.range(
      editor,
      mentionCharacter.range,
      SlateRange.end(match)
    ),
    text: SlateEditor.string(editor, match),
  };
}

export function isComposerBodyMention(
  node: SlateNode
): node is ComposerBodyMention {
  return SlateElement.isElement(node) && node.type === "mention";
}

export function insertMention(editor: SlateEditor, userId: string) {
  const mention: ComposerBodyMention = {
    type: "mention",
    userId,
    children: [{ text: "" }],
  };

  SlateTransforms.insertNodes(editor, mention);
  SlateTransforms.move(editor);
}

export function withMentions<T extends SlateEditor>(editor: T): T {
  const { isInline, isVoid, markableVoid, deleteBackward } = editor;

  editor.isInline = (element) => {
    return isComposerBodyMention(element) || isInline(element);
  };

  editor.isVoid = (element) => {
    return isComposerBodyMention(element) || isVoid(element);
  };

  editor.markableVoid = (element) => {
    return isComposerBodyMention(element) || markableVoid(element);
  };

  editor.deleteBackward = (unit) => {
    const { selection } = editor;

    if (isSelectionCollapsed(selection)) {
      const [mention] = SlateEditor.nodes(editor, {
        at:
          unit === "character"
            ? SlateEditor.before(editor, selection, { unit: "character" })
            : selection,
        match: isComposerBodyMention,
      });

      deleteBackward(unit);

      if (mention) {
        SlateTransforms.insertText(editor, MENTION_CHARACTER);
      }
    } else {
      deleteBackward(unit);
    }
  };

  return editor;
}
