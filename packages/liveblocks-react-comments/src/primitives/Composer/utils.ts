import type { Placement } from "@floating-ui/react-dom";
import type { CommentBody, CommentBodyMention } from "@liveblocks/core";
import { isCommentBodyMention } from "@liveblocks/core";
import { Editor as SlateEditor, Text as SlateText } from "slate";

import { isMention as isComposerBodyMention } from "../../slate/mentions";
import type {
  ComposerBody,
  ComposerBodyMarks,
  ComposerBodyMention,
  Direction,
} from "../../types";
import type { SuggestionsPosition } from "./types";

export function composerBodyMentionToCommentBodyMention(
  mention: ComposerBodyMention
): CommentBodyMention {
  return {
    type: "mention",
    userId: mention.userId,
  };
}

export function commentBodyMentionToComposerBodyMention(
  mention: CommentBodyMention
): ComposerBodyMention {
  return {
    type: "mention",
    userId: mention.userId,
    children: [{ text: "" }],
  };
}

export function composerBodyToCommentBody(body: ComposerBody): CommentBody {
  return {
    version: 1,
    content: body.map((block) => ({
      ...block,
      children: block.children.map((inline) => {
        if (SlateText.isText(inline)) {
          return inline;
        }

        if (isComposerBodyMention(inline)) {
          return composerBodyMentionToCommentBodyMention(inline);
        }

        return inline;
      }),
    })),
  };
}

export function commentBodyToComposerBody(body: CommentBody): ComposerBody {
  return body.content.map((block) => ({
    ...block,
    children: block.children.map((inline) => {
      if (isCommentBodyMention(inline)) {
        return commentBodyMentionToComposerBodyMention(inline);
      }

      return inline;
    }),
  }));
}

export function isMarkActive(editor: SlateEditor, format: ComposerBodyMarks) {
  const marks = SlateEditor.marks(editor);

  return marks ? marks[format] === true : false;
}

export function toggleMark(editor: SlateEditor, format: ComposerBodyMarks) {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    SlateEditor.removeMark(editor, format);
  } else {
    SlateEditor.addMark(editor, format, true);
  }
}

// The default focus behavior has some issues (e.g. setting the cursor at the beginning)
export function focusSlateReactEditor(node: HTMLDivElement) {
  if (window.getSelection && document.createRange) {
    const range = document.createRange();
    node.focus();
    range.setStart(node, node.childNodes.length);
    range.setEnd(node, node.childNodes.length);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } else {
    node.focus();
  }
}

export function getPlacementFromPosition(
  position: SuggestionsPosition,
  direction: Direction = "ltr"
): Placement {
  return `${position}-${direction === "rtl" ? "end" : "start"}`;
}

export function getSideAndAlignFromPlacement(placement: Placement) {
  const [side, align = "center"] = placement.split("-");

  return [side, align] as const;
}
