import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeNode } from "@lexical/code";

/**
 * Lexical nodes for the issue body editor — match `Editor.tsx` except we avoid
 * `@lexical/react` (HorizontalRuleNode) so this module stays safe in API routes.
 * Same set as `examples/nextjs-notion-like-ai-editor` `createRoomWithLexicalDocument`.
 */
export const ISSUE_LEXICAL_NODES = [
  CodeNode,
  LinkNode,
  ListNode,
  ListItemNode,
  HeadingNode,
  QuoteNode,
] as const;
