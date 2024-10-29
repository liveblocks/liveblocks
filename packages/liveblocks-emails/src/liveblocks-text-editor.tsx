/**
 * Liveblocks Text Editor Nodes
 *
 * Expose common types to transform nodes from different editors like `Lexical` or `TipTap`
 * and then convert them more easily as React or as html.
 */

import type { LexicalMentionNodeWithContext } from "./lexical-editor";

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

type MentionNodeWithContext =
  | {
      textEditorType: "lexical";
      mention: LexicalMentionNodeWithContext;
    }
  | {
      textEditorType: "tiptap";
      // TODO: add mention node with context for TipTap
    };

export function transformAsLiveblocksTextNodes(
  mentionWithContext: MentionNodeWithContext
): LiveblocksTextEditorNode[] {
  switch (mentionWithContext.textEditorType) {
    case "lexical": {
      // TODO
      return [];
    }
    case "tiptap": {
      // TODO
      return [];
    }
  }
}
