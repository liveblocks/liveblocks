import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type {
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import {
  $applyNodeReplacement,
  $createNodeSelection,
  $getNodeByKey,
  $setSelection,
  DecoratorNode,
} from "lexical";
import type { JSX, ReactNode } from "react";
import React, { useCallback, useRef, useSyncExternalStore } from "react";

import User from "./user";

export type SerializedMentionNode = Spread<
  {
    value: string;
  },
  SerializedLexicalNode
>;

const MENTION_CHARACTER = "@";

export class MentionNode extends DecoratorNode<JSX.Element> {
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
      <Mention nodeKey={this.getKey()}>
        {MENTION_CHARACTER}
        <User userId={this.__id} />
      </Mention>
    );
  }
}

function Mention({
  nodeKey,
  children,
}: {
  nodeKey: NodeKey;
  children: ReactNode;
}) {
  const [editor] = useLexicalComposerContext();
  const spanRef = useRef<HTMLSpanElement>(null);
  const isSelected = useIsNodeSelected(nodeKey);

  function handleClick(event: React.MouseEvent) {
    editor.update(() => {
      event.stopPropagation();
      event.preventDefault();

      const selection = $createNodeSelection();
      selection.add(nodeKey);
      $setSelection(selection);
    });
  }

  return (
    <span
      ref={spanRef}
      data-selected={isSelected ? "" : undefined}
      onClick={handleClick}
      className="lb-lexical-composer-mention"
    >
      {children}
    </span>
  );
}

// export function Mention({ userId: string }) {}

function $isNodeSelected(key: NodeKey): boolean {
  const node = $getNodeByKey(key);
  if (node === null) return false;
  return node.isSelected();
}

function useIsNodeSelected(key: NodeKey) {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerUpdateListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => $isNodeSelected(key));
  }, [editor, key]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function $createMentionNode(id: string): MentionNode {
  const node = new MentionNode(id);
  return $applyNodeReplacement(node);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined
): node is MentionNode {
  return node instanceof MentionNode;
}
