import type { NodeKey, SerializedLexicalNode, Spread } from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";

export type SerializedGroupMentionNode = Spread<
  {
    value: string;
  },
  SerializedLexicalNode
>;

export class GroupMentionNode extends DecoratorNode<null> {
  __id: string;

  constructor(value: string, key?: NodeKey) {
    super(key);
    this.__id = value;
  }

  static getType(): string {
    return "lb-group-mention";
  }

  static clone(node: GroupMentionNode): GroupMentionNode {
    return new GroupMentionNode(node.__id);
  }

  static importJSON(
    serializedNode: SerializedGroupMentionNode
  ): GroupMentionNode {
    const node = new GroupMentionNode(serializedNode.value);
    return $applyNodeReplacement(node);
  }

  exportJSON(): SerializedGroupMentionNode {
    return {
      value: this.getTextContent(),
      type: "lb-group-mention",
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
