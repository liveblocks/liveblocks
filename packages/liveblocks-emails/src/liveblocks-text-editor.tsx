/**
 * Liveblocks Text Editor Nodes
 *
 * Expose common types to transform nodes from different editors like `Lexical` or `TipTap`
 * and then convert them more easily as React or as html.
 */

import type {
  LexicalMentionNodeWithContext,
  SerializedLexicalNode,
} from "./lexical-editor";
import { assertSerializedMentionNode } from "./lexical-editor";

export type LiveblocksTextEditorTextNode = {
  type: "text";
  text: string;
};
export type LiveblocksTextEditorMentionNode = {
  type: "mention";
  userId: string;
};

export type LiveblocksTextEditorNode =
  | LiveblocksTextEditorTextNode
  | LiveblocksTextEditorMentionNode;

type TransformableMentionNodeWithContext =
  | {
      textEditorType: "lexical";
      mention: LexicalMentionNodeWithContext;
    }
  | {
      textEditorType: "tiptap";
      // TODO: add mention node with context for TipTap
    };

const transformLexicalMentionNodeWithContext = (
  mentionNodeWithContext: LexicalMentionNodeWithContext
): LiveblocksTextEditorNode[] => {
  const textEditorNodes: LiveblocksTextEditorNode[] = [];
  const { before, after, mention } = mentionNodeWithContext;

  const transform = (nodes: SerializedLexicalNode[]) => {
    for (const node of nodes) {
      if (node.group === "text") {
        textEditorNodes.push({
          type: "text",
          text: node.text,
        });
      } else if (
        node.group === "decorator" &&
        assertSerializedMentionNode(node)
      ) {
        textEditorNodes.push({
          type: "mention",
          userId: node.attributes.__userId,
        });
      }
    }
  };

  transform(before);
  textEditorNodes.push({
    type: "mention",
    userId: mention.attributes.__userId,
  });
  transform(after);

  return textEditorNodes;
};

export function transformAsLiveblocksTextEditorNodes(
  transformableMention: TransformableMentionNodeWithContext
): LiveblocksTextEditorNode[] {
  switch (transformableMention.textEditorType) {
    case "lexical": {
      return transformLexicalMentionNodeWithContext(
        transformableMention.mention
      );
    }
    case "tiptap": {
      // TODO
      return [];
    }
  }
}
