import { createInboxNotificationId } from "@liveblocks/core";
import { Group } from "@liveblocks/react-ui/_private";
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

import { MENTION_CHARACTER } from "../constants";
import { Mention } from "./mention-component";

export type SerializedGroupMentionNode = Spread<
  {
    groupId: string;
    userIds?: string[];
  },
  SerializedLexicalNode
>;
export class GroupMentionNode extends DecoratorNode<JSX.Element> {
  __id: string;
  __groupId: string;
  __userIds: string[] | undefined;

  constructor(
    id: string,
    groupId: string,
    userIds: string[] | undefined,
    key?: NodeKey
  ) {
    super(key);
    this.__id = id;
    this.__groupId = groupId;
    this.__userIds = userIds;
  }

  static getType(): string {
    return "lb-group-mention";
  }

  static clone(node: GroupMentionNode): GroupMentionNode {
    return new GroupMentionNode(
      node.__id,
      node.__groupId,
      node.__userIds,
      node.__key
    );
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
          const value = atob(
            element.getAttribute("data-lexical-lb-group-mention")!
          );
          const node = $createGroupMentionNode(value, undefined);
          return { node };
        },
        priority: 1,
      }),
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    const value = this.getTextContent();
    element.setAttribute("data-lexical-lb-group-mention", btoa(value));
    element.textContent = this.getTextContent();
    return { element };
  }

  static importJSON(
    serializedNode: SerializedGroupMentionNode
  ): GroupMentionNode {
    const node = $createGroupMentionNode(
      serializedNode.groupId,
      serializedNode.userIds
    );
    return node;
  }

  exportJSON(): SerializedGroupMentionNode {
    return {
      groupId: this.__groupId,
      type: "lb-group-mention",
      version: 1,
    };
  }

  getGroupId(): string {
    const self = this.getLatest();
    return self.__groupId;
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  getUserIds(): string[] | undefined {
    const self = this.getLatest();
    return self.__userIds;
  }

  decorate(): JSX.Element {
    return (
      <Mention nodeKey={this.getKey()}>
        {MENTION_CHARACTER}
        <Group groupId={this.getGroupId()} />
      </Mention>
    );
  }
}

export function $isGroupMentionNode(
  node: LexicalNode | null | undefined
): node is GroupMentionNode {
  return node instanceof GroupMentionNode;
}

export function $createGroupMentionNode(
  groupId: string,
  userIds: string[] | undefined
): GroupMentionNode {
  const node = new GroupMentionNode(
    createInboxNotificationId(),
    groupId,
    userIds
  );
  return $applyNodeReplacement(node);
}
