import type {
  BaseSelection,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, $isRangeSelection, ElementNode } from "lexical";

export type SerializedThreadMarkNode = Spread<
  {
    ids: Array<string>;
  },
  SerializedElementNode
>;

export class ThreadMarkNode extends ElementNode {
  /** @internal */
  __ids: Array<string>; // The ids of the threads that this mark is associated with

  static getType(): string {
    return "lb-thread-mark";
  }

  static clone(node: ThreadMarkNode): ThreadMarkNode {
    return new ThreadMarkNode(Array.from(node.__ids), node.__key);
  }

  static importJSON(serializedNode: SerializedThreadMarkNode): ThreadMarkNode {
    const node = $applyNodeReplacement<ThreadMarkNode>(
      new ThreadMarkNode(serializedNode.ids)
    );
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedThreadMarkNode {
    return {
      ...super.exportJSON(),
      ids: this.getIDs(),
      type: "lb-thread-mark",
      version: 1,
    };
  }

  getIDs(): Array<string> {
    const self = this.getLatest();
    return self instanceof ThreadMarkNode ? self.__ids : [];
  }

  constructor(ids: Array<string>, key?: NodeKey) {
    super(key);
    this.__ids = ids || [];
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  extractWithChild(
    _: LexicalNode,
    selection: BaseSelection,
    destination: "clone" | "html"
  ): boolean {
    if (!$isRangeSelection(selection) || destination === "html") {
      return false;
    }
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();
    const isBackward = selection.isBackward();
    const selectionLength = isBackward
      ? anchor.offset - focus.offset
      : focus.offset - anchor.offset;
    return (
      this.isParentOf(anchorNode) &&
      this.isParentOf(focusNode) &&
      this.getTextContent().length === selectionLength
    );
  }

  excludeFromCopy(destination: "clone" | "html"): boolean {
    return destination !== "clone";
  }
}
