import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $applyNodeReplacement,
  $createNodeSelection,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  DOMExportOutput,
  KEY_BACKSPACE_COMMAND,
  LexicalNode,
  NodeKey,
} from "lexical";
import type { JSX, MouseEvent } from "react";
import React, { useCallback, useEffect, useSyncExternalStore } from "react";

export default class MentionNode extends DecoratorNode<JSX.Element> {
  __value: string;

  constructor(value: string, key?: NodeKey) {
    super(key);
    this.__value = value;
  }

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__value);
  }

  createDOM(): HTMLElement {
    return document.createElement("span");
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-lexical-lb-mention", "true");
    element.textContent = this.getTextContent();
    return { element };
  }

  getTextContent(): string {
    const self = this.getLatest();
    return self.__value;
  }

  decorate(): JSX.Element {
    return <Mention value={this.__value} nodeKey={this.getKey()} />;
  }
}

function Mention({ value, nodeKey }: { value: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const isSelected = useIsNodeSelected(nodeKey);

  useEffect(() => {
    function $handleBackspace(event: KeyboardEvent): boolean {
      if (!isSelected) return false;
      const selection = $getSelection();
      if (!$isNodeSelection(selection)) return false;
      const node = $getNodeByKey(nodeKey);
      if (!$isMentionNode(node)) return false;
      event.preventDefault();
      node.remove();
      return true;
    }

    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      $handleBackspace,
      COMMAND_PRIORITY_LOW
    );
  }, [editor, isSelected, nodeKey]);

  function handleClick(event: MouseEvent) {
    editor.update(() => {
      if (event.shiftKey) return;
      const selection = $createNodeSelection();
      selection.add(nodeKey);
      $setSelection(selection);
      event.stopPropagation();
      event.preventDefault();
    });
  }

  return (
    <span data-selected={isSelected ? "" : undefined} onClick={handleClick}>
      {value}
    </span>
  );
}

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

export function $createMentionNode(value: string): MentionNode {
  const node = new MentionNode(value);
  return $applyNodeReplacement(node);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined
): node is MentionNode {
  return node instanceof MentionNode;
}
