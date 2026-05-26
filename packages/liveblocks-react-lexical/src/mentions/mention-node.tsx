import { createInboxNotificationId, MENTION_CHARACTER } from "@liveblocks/core";
import type { UserMentionData } from "@liveblocks/core";
import { User } from "@liveblocks/react-ui/_private";
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

export type SerializedMentionNode = Spread<
  {
    userId: string;
    role?: UserMentionData["role"];
  },
  SerializedLexicalNode
>;
export class MentionNode extends DecoratorNode<JSX.Element> {
  __id: string;
  __userId: string;
  __role: UserMentionData["role"];

  constructor(
    id: string,
    userId: string,
    role?: UserMentionData["role"],
    key?: NodeKey
  ) {
    super(key);
    this.__id = id;
    this.__userId = userId;
    this.__role = role;
  }

  static getType(): string {
    return "lb-mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__id, node.__userId, node.__role, node.__key);
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

  static importDOM(): DOMConversionMap<HTMLElement> | null {
    return {
      span: () => ({
        conversion: (element) => {
          const userId = element.getAttribute("data-lexical-lb-mention");
          const role = element.getAttribute("data-lexical-lb-mention-role");

          if (!userId) {
            return null;
          }

          const node = $createMentionNode(
            userId,
            role === "agent" ? role : undefined
          );
          return { node };
        },
        priority: 1,
      }),
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-lexical-lb-mention", this.getUserId());
    if (this.getRole() === "agent") {
      element.setAttribute("data-lexical-lb-mention-role", this.getRole());
    }
    element.textContent = this.getUserId();
    return { element };
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    const node = $createMentionNode(serializedNode.userId, serializedNode.role);
    return node;
  }

  exportJSON(): SerializedMentionNode {
    const serializedNode: SerializedMentionNode = {
      userId: this.__userId,
      type: "lb-mention",
      version: 1,
    };

    if (this.__role === "agent") {
      serializedNode.role = this.__role;
    }

    return serializedNode;
  }

  getUserId(): string {
    const self = this.getLatest();
    return self.__userId;
  }

  getRole(): UserMentionData["role"] {
    const self = this.getLatest();
    return self.__role;
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  decorate(): JSX.Element {
    return (
      <Mention nodeKey={this.getKey()}>
        <span className="lb-mention-symbol">{MENTION_CHARACTER}</span>
        <User userId={this.getUserId()} />
      </Mention>
    );
  }

  getTextContent(): string {
    return MENTION_CHARACTER + this.getUserId();
  }
}

export function $isMentionNode(
  node: LexicalNode | null | undefined
): node is MentionNode {
  return node instanceof MentionNode;
}

export function $createMentionNode(
  userId: string,
  role?: UserMentionData["role"]
): MentionNode {
  const node = new MentionNode(createInboxNotificationId(), userId, role);
  return $applyNodeReplacement(node);
}
