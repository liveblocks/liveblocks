import {
  CommentBodyMention,
  CommentBodyElement,
  CommentBody,
} from "@liveblocks/core";

export const formatDate = (date: Date | string) => {
  const formatter = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "numeric",
  });

  return formatter.format(new Date(date));
};

export const getPlainTextFromCommentBody = (body: CommentBody): string => {
  let plainText = "";

  for (const paragraph of body.content) {
    plainText += getParagraphText(paragraph.children);
  }

  return plainText;
};

export const getMentionedIdsFromCommentBody = (body: CommentBody): string[] => {
  const mentionedIdsSet = new Set<string>();

  for (const element of body.content) {
    for (const child of element.children) {
      if (isMention(child)) mentionedIdsSet.add(child.id);
    }
  }

  return Array.from(mentionedIdsSet);
};

const getParagraphText = (elements: CommentBodyElement[]): string => {
  let paragraphText = "";

  for (const element of elements) {
    if ("text" in element) {
      const { text } = element;

      paragraphText += text;
    } else if (element.type === "mention") {
      paragraphText += `@${element.id}`;
    }
  }

  return paragraphText;
};

const isMention = (
  element: CommentBodyElement
): element is CommentBodyMention => {
  if (
    "type" in element &&
    // explicit guard if we add more types
    // eslint-disable-next-line
    element.type === "mention"
  ) {
    return true;
  }

  return false;
};
