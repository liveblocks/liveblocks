import { MENTION_CHARACTER } from "@liveblocks/core";
import type { NodeKey, SerializedLexicalNode, Spread } from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";

type LegacySerializedMentionNode = Spread<
  {
    // Legacy field now named `id`
    value: string;
    // Not present in legacy nodes
    userId: never;
  },
  SerializedLexicalNode
>;

export type SerializedMentionNode = Spread<
  {
    id: string;
    userId: string | undefined;
  },
  SerializedLexicalNode
>;

export class MentionNode extends DecoratorNode<null> {
  __id: string;
  __userId: string | undefined;

  constructor(id: string, userId: string | undefined, key?: NodeKey) {
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

  static importJSON(
    serializedNode: SerializedMentionNode | LegacySerializedMentionNode
  ): MentionNode {
    const node = new MentionNode(
      (serializedNode as LegacySerializedMentionNode).value ??
        (serializedNode as SerializedMentionNode).id,
      (serializedNode as SerializedMentionNode).userId
    );
    return $applyNodeReplacement(node);
  }

  exportJSON(): SerializedMentionNode {
    return {
      id: this.getId(),
      userId: this.getUserId(),
      type: "lb-mention",
      version: 1,
    };
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  getUserId(): string | undefined {
    const self = this.getLatest();
    return self.__userId;
  }

  getTextContent(): string {
    const userId = this.getUserId();

    if (userId) {
      return MENTION_CHARACTER + userId;
    }

    // Legacy behavior: return the ID as text content
    // Since the ID is an inbox notification ID ("in_xxx") and not a user ID, this isn't ideal
    return this.getId();
  }

  decorate(): null {
    return null;
  }
}
