import type { NodeKey, SerializedLexicalNode, Spread } from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";

import { MENTION_CHARACTER } from "./constants";

export type SerializedGroupMentionNode = Spread<
  {
    id: string;
    groupId: string;
    userIds: string[] | undefined;
  },
  SerializedLexicalNode
>;

export class GroupMentionNode extends DecoratorNode<null> {
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
    return new GroupMentionNode(node.__id, node.__groupId, node.__userIds);
  }

  static importJSON(
    serializedNode: SerializedGroupMentionNode
  ): GroupMentionNode {
    const node = new GroupMentionNode(
      serializedNode.id,
      serializedNode.groupId,
      serializedNode.userIds
    );
    return $applyNodeReplacement(node);
  }

  exportJSON(): SerializedGroupMentionNode {
    return {
      id: this.getId(),
      groupId: this.getGroupId(),
      userIds: this.getUserIds(),
      type: "lb-group-mention",
      version: 1,
    };
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  getGroupId(): string {
    const self = this.getLatest();
    return self.__groupId;
  }

  getUserIds(): string[] | undefined {
    const self = this.getLatest();
    return self.__userIds;
  }

  getTextContent(): string {
    const groupId = this.getGroupId();

    return MENTION_CHARACTER + groupId;
  }

  decorate(): null {
    return null;
  }
}
