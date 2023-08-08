import type { Node as SlateNode, Point } from "slate";
import {
  Editor as SlateEditor,
  Element as SlateElement,
  Range as SlateRange,
  Transforms as SlateTransforms,
} from "slate";

import type { ComposerBodyMention } from "../types";

export const MENTION_CHARACTER = "@";

type RangeDirection = "left" | "right" | "both";

export type MentionDraft = {
  range: SlateRange;
  text: string;
};

function getWordRange(
  editor: SlateEditor,
  location: SlateRange,
  terminators: string[] = [" "],
  include: boolean = false,
  direction: RangeDirection = "both"
): SlateRange | undefined {
  let [start, end] = SlateRange.edges(location);
  let point: Point = start;

  function move(direction: Omit<RangeDirection, "both">): boolean {
    const next =
      direction === "right"
        ? SlateEditor.after(editor, point, {
            unit: "character",
          })
        : SlateEditor.before(editor, point, { unit: "character" });
    const nextWord =
      next &&
      SlateEditor.string(
        editor,
        direction === "right"
          ? { anchor: point, focus: next }
          : { anchor: next, focus: point }
      );
    const lastWord =
      nextWord && nextWord[direction === "right" ? 0 : nextWord.length - 1];

    if (next && lastWord && !terminators.includes(lastWord)) {
      point = next;

      if (point.offset === 0) {
        return false;
      }
    } else {
      return false;
    }

    return true;
  }

  if (direction !== "left") {
    point = end;

    while (move("right"));

    end = point;
  }

  if (direction !== "right") {
    point = start;

    while (move("left"));

    start = point;
  }

  if (include) {
    return {
      anchor: SlateEditor.before(editor, start, { unit: "offset" }) ?? start,
      focus: SlateEditor.after(editor, end, { unit: "offset" }) ?? end,
    };
  }

  return { anchor: start, focus: end };
}

export function getMentionDraftAtSelection(
  editor: SlateEditor
): MentionDraft | undefined {
  const { selection } = editor;

  if (!selection || !SlateRange.isCollapsed(selection)) {
    return;
  }

  const word = getWordRange(editor, selection, [" ", MENTION_CHARACTER]);

  if (!word) {
    return;
  }

  const before = SlateEditor.before(editor, word, { unit: "character" });

  if (!before) {
    return;
  }

  const beforeRange = SlateEditor.range(editor, before, SlateRange.start(word));
  const beforeText = SlateEditor.string(editor, beforeRange);

  if (beforeText !== MENTION_CHARACTER) {
    return;
  }

  return {
    range: SlateEditor.range(editor, before, SlateRange.end(word)),
    text: SlateEditor.string(editor, word),
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
