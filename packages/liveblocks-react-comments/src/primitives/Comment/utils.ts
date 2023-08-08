import type { CommentBodyElement, CommentBodyMention } from "@liveblocks/core";

export function isCommentBodyMention(
  element: CommentBodyElement
): element is CommentBodyMention {
  return "type" in element && element.type === "mention";
}
