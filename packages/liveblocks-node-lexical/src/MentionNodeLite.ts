import type { NodeKey, SerializedLexicalNode, Spread } from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";

const MENTION_CHARACTER = "@";

type LegacySerializedMentionNode = Spread<
  {
    // Legacy field, now named `id`
    value: string;
  },
  SerializedLexicalNode
>;

export type SerializedMentionNode = Spread<
  {
    id: string;
  },
  SerializedLexicalNode
>;

export class MentionNode extends DecoratorNode<null> {
  __id: string;

  constructor(id: string, key?: NodeKey) {
    super(key);
    this.__id = id;
  }

  static getType(): string {
    return "lb-mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__id);
  }

  static importJSON(
    serializedNode: SerializedMentionNode | LegacySerializedMentionNode
  ): MentionNode {
    const node = new MentionNode(
      (serializedNode as LegacySerializedMentionNode).value ??
        (serializedNode as SerializedMentionNode).id
    );
    return $applyNodeReplacement(node);
  }

  exportJSON(): SerializedMentionNode {
    return {
      id: this.getId(),
      type: "lb-mention",
      version: 1,
    };
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  getTextContent(): string {
    // We don't have a `__userId` value, `__id` is an inbox notification ID ("in_xxx")
    // so it isn't human readable and not suitable as text content.
    return MENTION_CHARACTER;
  }

  decorate(): null {
    return null;
  }
}
