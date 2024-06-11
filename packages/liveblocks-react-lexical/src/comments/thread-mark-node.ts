import type {
  BaseSelection,
  LexicalNode,
  NodeKey,
  RangeSelection,
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

  static importDOM(): null {
    return null;
  }

  static importJSON(serializedNode: SerializedThreadMarkNode): ThreadMarkNode {
    const node = $createThreadMarkNode(serializedNode.ids);
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

  constructor(ids: Array<string>, key?: NodeKey) {
    super(key);
    this.__ids = ids || [];
  }

  createDOM(): HTMLElement {
    const element = document.createElement("span");
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  hasID(id: string): boolean {
    const ids = this.getIDs();
    for (let i = 0; i < ids.length; i++) {
      if (id === ids[i]) {
        return true;
      }
    }
    return false;
  }

  getIDs(): Array<string> {
    const self = this.getLatest();
    return $isThreadMarkNode(self) ? self.__ids : [];
  }

  addID(id: string): void {
    const self = this.getWritable();
    if ($isThreadMarkNode(self)) {
      const ids = self.__ids;
      self.__ids = ids;
      for (let i = 0; i < ids.length; i++) {
        // If we already have it, don't add again
        if (id === ids[i]) {
          return;
        }
      }
      ids.push(id);
    }
  }

  deleteID(id: string): void {
    const self = this.getWritable();
    if ($isThreadMarkNode(self)) {
      const ids = self.__ids;
      self.__ids = ids;
      for (let i = 0; i < ids.length; i++) {
        if (id === ids[i]) {
          ids.splice(i, 1);
          return;
        }
      }
    }
  }

  insertNewAfter(
    _: RangeSelection,
    restoreSelection = true
  ): null | ElementNode {
    const markNode = $createThreadMarkNode(this.__ids);
    this.insertAfter(markNode, restoreSelection);
    return markNode;
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

export function $createThreadMarkNode(ids: Array<string>): ThreadMarkNode {
  return $applyNodeReplacement(new ThreadMarkNode(ids));
}

export function $isThreadMarkNode(
  node: LexicalNode | null
): node is ThreadMarkNode {
  return node instanceof ThreadMarkNode;
}
