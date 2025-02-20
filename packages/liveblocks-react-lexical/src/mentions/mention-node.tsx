import { createInboxNotificationId } from "@liveblocks/core";
import type {
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";

import { Mention } from "./mention-component";
import { User } from "./user";

const MENTION_CHARACTER = "@";

export type SerializedMentionNode = Spread<
  {
    userId: string;
  },
  SerializedLexicalNode
>;
export class MentionNode extends DecoratorNode<JSX.Element> {
  __id: string;
  __userId: string;

  constructor(id: string, userId: string, key?: NodeKey) {
    super(key);
    this.__id = id;
    this.__userId = userId;
  }

  static getType(): string {
    return "lb-mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__id, node.__userId, node.__key);
  }

  createDOM(): HTMLElement {
    const element = document.createElement("span");
    element.style.display = "inline-block";
    element.style.userSelect = "none";
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDom(): DOMConversionMap<HTMLElement> | null {
    return {
      span: () => ({
        conversion: (element) => {
          const value = atob(element.getAttribute("data-lexical-lb-mention")!);
          const node = $createMentionNode(value);
          return { node };
        },
        priority: 1,
      }),
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    const value = this.getTextContent();
    element.setAttribute("data-lexical-lb-mention", btoa(value));
    element.textContent = this.getTextContent();
    return { element };
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    const node = $createMentionNode(serializedNode.userId);
    return node;
  }

  exportJSON(): SerializedMentionNode {
    return {
      userId: this.__userId,
      type: "lb-mention",
      version: 1,
    };
  }

  getUserId(): string {
    const self = this.getLatest();
    return self.__userId;
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  decorate(): JSX.Element {
    return (
      <Mention nodeKey={this.getKey()}>
        {MENTION_CHARACTER}
        <User userId={this.getUserId()} />
      </Mention>
    );
  }
}

export function $isMentionNode(
  node: LexicalNode | null | undefined
): node is MentionNode {
  return node instanceof MentionNode;
}

export function $createMentionNode(userId: string): MentionNode {
  const node = new MentionNode(createInboxNotificationId(), userId);
  return $applyNodeReplacement(node);
}
