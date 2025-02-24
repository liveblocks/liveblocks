import type { LexicalNode, TextNode } from "lexical";
import { $isTextNode } from "lexical";

import { $isThreadMarkNode } from "./thread-mark-node";

export default function $getThreadMarkIds(
  node: TextNode,
  offset: number
): null | Array<string> {
  let currentNode: LexicalNode | null = node;
  while (currentNode !== null) {
    if ($isThreadMarkNode(currentNode)) {
      return currentNode.getIDs();
    } else if (
      $isTextNode(currentNode) &&
      offset === currentNode.getTextContentSize()
    ) {
      const nextSibling = currentNode.getNextSibling();
      if ($isThreadMarkNode(nextSibling)) {
        return nextSibling.getIDs();
      }
    }
    currentNode = currentNode.getParent();
  }
  return null;
}
