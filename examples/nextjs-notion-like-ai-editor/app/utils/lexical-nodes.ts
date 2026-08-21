import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { Klass, LexicalNode } from "lexical";

/** Lexical node classes shared by the editor and server-side Markdown conversion. */
export const LEXICAL_NODES: ReadonlyArray<Klass<LexicalNode>> = [
  HorizontalRuleNode,
  CodeNode,
  LinkNode,
  ListNode,
  ListItemNode,
  HeadingNode,
  QuoteNode,
];
