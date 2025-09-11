import { MENTION_CHARACTER, type MentionData } from "@liveblocks/core";
import type { Node as SlateNode } from "slate";
import {
  Editor as SlateEditor,
  Element as SlateElement,
  Range as SlateRange,
  Transforms as SlateTransforms,
} from "slate";

import type { ComposerBodyMention } from "../../../../types";
import {
  getCharacterAfter,
  getCharacterBefore,
} from "../../../slate/utils/get-character";
import { getMatchRange } from "../../../slate/utils/get-match-range";
import { isEmptyString } from "../../../slate/utils/is-empty-string";
import { isWhitespaceCharacter } from "../../../slate/utils/is-whitespace-character";

export type MentionDraft = {
  range: SlateRange;
  text: string;
};

export function getMentionDraftAtSelection(
  editor: SlateEditor
): MentionDraft | undefined {
  const { selection } = editor;

  if (!selection || !SlateRange.isCollapsed(selection)) {
    return;
  }

  // Walk backwards from the selection until "@" is found, unless the character
  // before isn't whitespace (or "@" is the block's first character)
  const match = getMatchRange(editor, selection, ["@"], {
    include: true,
    allowConsecutiveWhitespace: false,
    ignoreTerminator: (_, point) => {
      const characterBefore = getCharacterBefore(editor, point);

      // Ignore "@" if it's preceded by a non-whitespace character
      if (characterBefore && !isWhitespaceCharacter(characterBefore.text)) {
        return true;
      }

      return false;
    },
  });

  if (!match) {
    return;
  }

  const matchText = SlateEditor.string(editor, match);

  // Check if the match starts with the mention character (not followed by a whitespace character)
  if (
    !matchText.startsWith(MENTION_CHARACTER) ||
    (matchText.length > 1 && isWhitespaceCharacter(matchText[1]))
  ) {
    return;
  }

  return {
    range: match,
    // Exclude the mention character from the text
    text: matchText.substring(1),
  };
}

export function isComposerBodyMention(
  node: SlateNode
): node is ComposerBodyMention {
  return SlateElement.isElement(node) && node.type === "mention";
}

export function insertMention(editor: SlateEditor, mention: MentionData) {
  const mentionNode: ComposerBodyMention = {
    type: "mention",
    ...mention,
    children: [{ text: "" }],
  };

  // Insert the mention
  SlateTransforms.insertNodes(editor, mentionNode);
  SlateTransforms.move(editor);

  const afterCharacter = editor.selection
    ? getCharacterAfter(editor, editor.selection)
    : undefined;

  if (!afterCharacter || afterCharacter.void) {
    // Insert a following space if needed
    SlateTransforms.insertText(editor, " ");
  } else if (isEmptyString(afterCharacter.text)) {
    // Move the selection if it's already followed by a space
    SlateTransforms.move(editor);
  }
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
    beforeCharacter && !isEmptyString(beforeCharacter.text);
  const shouldInsertSpaceAfter =
    afterCharacter && !isEmptyString(afterCharacter.text);

  if (!SlateRange.isCollapsed(editor.selection)) {
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

    if (selection && SlateRange.isCollapsed(selection)) {
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
