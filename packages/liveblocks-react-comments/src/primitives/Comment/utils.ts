import type {
  CommentBodyElement,
  CommentBodyMention,
  CommentBodyLink,
} from "@liveblocks/core";

export function isCommentBodyMention(
  element: CommentBodyElement
): element is CommentBodyMention {
  return "type" in element && element.type === "mention";
}

export function isCommentBodyLink(
  element: CommentBodyElement
): element is CommentBodyLink {
  return "type" in element && element.type === "link";
}
