import type { CommentBody, CommentBodyParagraph } from "@liveblocks/core";

/**
 * Gets the plain text from a comment body.
 * TODO: add parsing options for each element type and text formatting.
 */
function getPlainTextFromCommentBody(body: CommentBody): string {
  function traverseElementsV1(elements: CommentBodyParagraph['children']): string {
    let plainText = "";

    for (const element of elements) {
      if ("text" in element) {
        const { text } = element;

        plainText += text;
      } else if (element.type === "mention") {
        plainText += ` @${element.userId}`;
      }
    }

    return plainText;
  }

  let plainText = "";

  if (body.version === 1) {
    for (const paragraph of body.content) {
      plainText += traverseElementsV1(paragraph.children);
    }
  } else {
    throw new Error(`Unsupported comment body version: ${body.version}`);
  }
  return plainText;
}

export {
  getPlainTextFromCommentBody
}