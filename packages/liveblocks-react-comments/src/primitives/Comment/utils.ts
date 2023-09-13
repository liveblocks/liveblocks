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

export function toAbsoluteURL(url: string): string | undefined {
  // Check if the URL already contains a scheme
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  } else if (url.startsWith("www.")) {
    // If the URL starts with "www.", prepend "https://"
    return "https://" + url;
  }
  return;
}
