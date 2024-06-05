import type {
  DOMConversionMap,
  DOMExportOutput,
  Klass,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import { nanoid } from "nanoid";
import type { ComponentType, JSX } from "react";
import * as React from "react";

import type { MentionProps } from "../liveblocks-config";
import { MentionWrapper } from "./mention-component";

export type SerializedMentionNode = Spread<
  {
    userId: string;
  },
  SerializedLexicalNode
>;

interface IMentionNode extends DecoratorNode<JSX.Element> {
  __id: string;
  __userId: string;

  getUserId(): string;
  getId(): string;
}

export function createMentionNodeFactory(
  Component: ComponentType<MentionProps>
): {
  MentionNode: Klass<IMentionNode>;
  $isMentionNode: (
    node: LexicalNode | null | undefined
  ) => node is IMentionNode;
  $createMentionNode: (userId: string) => IMentionNode;
} {
  class MentionNode extends DecoratorNode<JSX.Element> implements IMentionNode {
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
      return new MentionNode(node.__id, node.__userId);
    }

    createDOM(): HTMLElement {
      const element = document.createElement("span");
      element.style.display = "inline-block";
      return element;
    }

    updateDOM(): boolean {
      return false;
    }

    static importDom(): DOMConversionMap<HTMLElement> | null {
      return {
        span: () => ({
          conversion: (element) => {
            const value = atob(
              element.getAttribute("data-lexical-lb-mention")!
            );
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
        <MentionWrapper nodeKey={this.getKey()}>
          <Component userId={this.__userId} />
        </MentionWrapper>
      );
    }
  }

  function $isMentionNode(
    node: LexicalNode | null | undefined
  ): node is MentionNode {
    return node instanceof MentionNode;
  }

  function $createMentionNode(userId: string): MentionNode {
    const id = `in_${nanoid()}`;
    const node = new MentionNode(id, userId);
    return $applyNodeReplacement(node);
  }

  return {
    MentionNode,
    $isMentionNode,
    $createMentionNode,
  };
}
