import type { NodeKey, SerializedLexicalNode, Spread } from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";

export type SerializedMentionNode = Spread<
  {
    value: string;
  },
  SerializedLexicalNode
>;

export class MentionNode extends DecoratorNode<null> {
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

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    const node = new MentionNode(serializedNode.value);
    return $applyNodeReplacement(node);
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

  decorate(): null {
    return null;
  }
}
