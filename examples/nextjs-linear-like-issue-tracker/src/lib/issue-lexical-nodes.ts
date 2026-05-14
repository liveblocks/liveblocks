import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeNode } from "@lexical/code";

// Lexical nodes used in issue content
export const ISSUE_LEXICAL_NODES = [
  CodeNode,
  LinkNode,
  ListNode,
  ListItemNode,
  HeadingNode,
  QuoteNode,
] as const;
