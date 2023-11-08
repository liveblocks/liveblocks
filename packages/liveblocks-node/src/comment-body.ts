import type {
  CommentBody,
  CommentBodyElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
} from "@liveblocks/core";

type CommentBodyElementType =
  | Exclude<CommentBodyElement, CommentBodyText>["type"]
  | "text";

type CommentBodyElementTypes = {
  paragraph: CommentBodyParagraph;
  text: CommentBodyText;
  link: CommentBodyLink;
  mention: CommentBodyMention;
};

type CommentBodyVisitor<T extends CommentBodyElement = CommentBodyElement> = (
  element: T
) => void;

function isCommentBodyParagraph(
  element: CommentBodyElement
): element is CommentBodyParagraph {
  return "type" in element && element.type === "mention";
}

function isCommentBodyText(
  element: CommentBodyElement
): element is CommentBodyText {
  return "text" in element && typeof element.text === "string";
}

function isCommentBodyMention(
  element: CommentBodyElement
): element is CommentBodyMention {
  return "type" in element && element.type === "mention";
}

function isCommentBodyLink(
  element: CommentBodyElement
): element is CommentBodyLink {
  return "type" in element && element.type === "link";
}

const commentBodyElementsGuards: Record<
  CommentBodyElementType,
  (element: CommentBodyElement) => boolean
> = {
  paragraph: isCommentBodyParagraph,
  text: isCommentBodyText,
  link: isCommentBodyLink,
  mention: isCommentBodyMention,
};

function traverseCommentBody(
  body: CommentBody,
  visitor: CommentBodyVisitor
): void;
function traverseCommentBody<T extends CommentBodyElementType>(
  body: CommentBody,
  type: T,
  visitor: CommentBodyVisitor<CommentBodyElementTypes[T]>
): void;
function traverseCommentBody(
  body: CommentBody,
  typeOrVisitor: CommentBodyElementType | CommentBodyVisitor,
  possiblyVisitor?: CommentBodyVisitor
): void {
  const type = typeof typeOrVisitor === "string" ? typeOrVisitor : undefined;
  const visitor =
    typeof typeOrVisitor === "function" ? typeOrVisitor : possiblyVisitor;
  const guard = type ? commentBodyElementsGuards[type] : () => true;

  for (const block of body.content) {
    if (guard(block)) {
      visitor?.(block);
    }

    for (const inline of block.children) {
      if (guard(inline)) {
        visitor?.(inline);
      }
    }
  }
}

/**
 * TODO: JSDoc
 */
export function getMentionIdsFromCommentBody(body: CommentBody): string[] {
  const mentionIds = new Set<string>();

  traverseCommentBody(body, "mention", (mention) => mentionIds.add(mention.id));

  return Array.from(mentionIds);
}
