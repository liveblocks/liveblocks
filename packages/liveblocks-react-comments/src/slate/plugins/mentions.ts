import type { Node as SlateNode } from "slate";
import {
  Editor as SlateEditor,
  Element as SlateElement,
  Range as SlateRange,
  Transforms as SlateTransforms,
} from "slate";

import type { ComposerBodyMention } from "../../types";
import { getCharacterAfter, getCharacterBefore } from "../utils/get-character";
import { getMatchRange } from "../utils/get-match-range";
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

  if (!match) {
    return;
  }

  const mentionCharacter = getCharacterBefore(editor, match);

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

export function insertMentionCharacter(editor: SlateEditor) {
  if (!editor.selection) {
    return;
  }

  // Check if the selection is preceded or followed by a non-whitespace character
  const beforeCharacter = getCharacterBefore(editor, editor.selection, {
    filterVoids: true,
  });
  const afterCharacter = getCharacterAfter(editor, editor.selection, {
    filterVoids: true,
  });
  const shouldInsertSpaceBefore =
    beforeCharacter && beforeCharacter.text.trim() !== "";
  const shouldInsertSpaceAfter =
    afterCharacter && afterCharacter.text.trim() !== "";

  if (isSelectionCollapsed(editor.selection)) {
    const text =
      (shouldInsertSpaceBefore ? " " : "") +
      MENTION_CHARACTER +
      (shouldInsertSpaceAfter ? " " : "");

    // If the selection is collapsed, insert the mention character at the current selection
    editor.insertText(text);

    // If a following space was inserted, move the selection back by one
    if (shouldInsertSpaceAfter) {
      SlateTransforms.move(editor, {
        distance: 1,
        unit: "character",
        reverse: true,
      });
    }
  } else {
    const beforeText = (shouldInsertSpaceBefore ? " " : "") + MENTION_CHARACTER;

    // If the selection is not collapsed, insert the mention character before the selection
    editor.insertText(beforeText, { at: SlateRange.start(editor.selection) });

    if (shouldInsertSpaceAfter) {
      editor.insertText(" ", { at: SlateRange.end(editor.selection) });
    }

    // Collapse the selection at its end
    SlateTransforms.collapse(editor, { edge: "end" });
  }
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
