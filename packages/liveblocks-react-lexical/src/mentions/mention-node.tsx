import type {
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { ComponentType, JSX } from "react";
import * as React from "react";

import type { MentionProps } from "../liveblocks-config";
import { MentionWrapper } from "./mention-component";

export type SerializedMentionNode = Spread<
  {
    value: string;
  },
  SerializedLexicalNode
>;

export function createMentionNodeFactory(
  Component: ComponentType<MentionProps>
): any {
  class MentionNode extends DecoratorNode<JSX.Element> {
    __id: string;

    constructor(value: string, key?: NodeKey) {
      super(key);
      this.__id = value;
    }

    static getType(): string {
      return "lb-mention";
    }

    static clone(node: MentionNode): MentionNode {
      return new MentionNode(node.__id);
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
      const node = $createMentionNode(serializedNode.value);
      return node;
    }

    exportJSON(): SerializedMentionNode {
      return {
        value: this.getTextContent(),
        type: "lb-mention",
        version: 1,
      };
    }

    getTextContent(): string {
      const self = this.getLatest();
      return self.__id;
    }

    decorate(): JSX.Element {
      return (
        <MentionWrapper nodeKey={this.getKey()}>
          <Component userId={this.__id} />
        </MentionWrapper>
      );
    }
  }

  function $isMentionNode(
    node: LexicalNode | null | undefined
  ): node is MentionNode {
    return node instanceof MentionNode;
  }

  function $createMentionNode(id: string): MentionNode {
    const node = new MentionNode(id);
    return $applyNodeReplacement(node);
  }

  return {
    MentionNode,
    $isMentionNode,
    $createMentionNode,
  };
}
