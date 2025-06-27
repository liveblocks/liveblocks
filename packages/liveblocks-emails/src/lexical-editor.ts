import type { Json, JsonObject } from "@liveblocks/core";
import * as Y from "yjs";

import { isMentionNodeAttributeId, isString } from "./lib/utils";

export interface SerializedBaseLexicalNode {
  type: string;
  attributes: JsonObject;
}

export interface SerializedLexicalTextNode extends SerializedBaseLexicalNode {
  text: string;
  group: "text";
}

export interface SerializedLexicalElementNode<
  T extends SerializedBaseLexicalNode,
> extends SerializedBaseLexicalNode {
  children: Array<T>;
  group: "element";
}

export interface SerializedLexicalDecoratorNode
  extends SerializedBaseLexicalNode {
  group: "decorator";
}

export interface SerializedLexicalMentionNode
  extends SerializedLexicalDecoratorNode {
  type: "lb-mention";
  attributes: {
    __id: string;
    __type: "lb-mention";
    __userId: string;
  };
}

export interface SerializedLexicalGroupMentionNode
  extends SerializedLexicalDecoratorNode {
  type: "lb-group-mention";
  attributes: {
    __id: string;
    __type: "lb-group-mention";
    __groupId: string;
    __userIds: string[] | undefined;
  };
}

export interface SerializedLexicalLineBreakNode
  extends SerializedBaseLexicalNode {
  group: "linebreak";
}

export type SerializedLexicalNode =
  | SerializedLexicalTextNode
  | SerializedLexicalLineBreakNode
  | SerializedLexicalDecoratorNode
  | SerializedLexicalElementNode<SerializedLexicalNode>;

export type SerializedLexicalRootNodeChildren = Array<
  Readonly<
    | SerializedLexicalElementNode<Readonly<SerializedLexicalNode>>
    | SerializedLexicalDecoratorNode
    | SerializedLexicalLineBreakNode
  >
>;

export interface SerializedLexicalRootNode
  extends Readonly<SerializedBaseLexicalNode> {
  readonly type: "root";
  readonly children: SerializedLexicalRootNodeChildren;
}

/**
 * Create a serialized Lexical Map node.
 * Y.Map shared types are used to represent text nodes and line break nodes in Lexical.js
 */
function createSerializedLexicalMapNode(
  item: Y.Map<Json>
): SerializedLexicalTextNode | SerializedLexicalLineBreakNode {
  const type = item.get("__type");
  if (typeof type !== "string") {
    throw new Error(
      `Expected ${item.constructor.name} to include type attribute`
    );
  }

  // Y.Map in Lexical stores all attributes defined in Lexical TextNode and LineBreakNode class.
  const attributes = Object.fromEntries(item.entries());
  if (type === "linebreak") {
    return {
      type,
      attributes,
      group: "linebreak",
    };
  }

  return {
    type,
    attributes,
    text: "",
    group: "text",
  };
}

/**
 * Create a serialized Lexical decorator node.
 * Y.XmlElement shared types are used to represent decorator nodes in Lexical.js
 */
function createSerializedLexicalDecoratorNode(
  item: Y.XmlElement
): SerializedLexicalDecoratorNode {
  const type = item.getAttribute("__type");
  if (typeof type !== "string") {
    throw new Error(
      `Expected ${item.constructor.name} to include type attribute`
    );
  }
  const attributes = item.getAttributes();

  return {
    type,
    attributes,
    group: "decorator",
  };
}

/**
 * Create a serialized Lexical element node.
 * Y.XmlText shared types are used to represent element nodes (e.g. paragraph, blockquote) in Lexical.js
 */
function createSerializedLexicalElementNode(
  item: Y.XmlText
): SerializedLexicalElementNode<SerializedLexicalNode> {
  // Note: disabling eslint rule as `getAttribute` returns `any` by default on `Y.XmlText` items.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const type = item.getAttribute("__type");
  if (typeof type !== "string") {
    throw new Error(
      `Expected ${item.constructor.name} to include type attribute`
    );
  }
  const attributes = item.getAttributes();

  let start = item._start;
  const children: SerializedLexicalNode[] = [];
  while (start !== null) {
    // If the item is deleted, skip it.
    if (start.deleted) {
      start = start.right;
      continue;
    }

    if (start.content instanceof Y.ContentType) {
      const content = start.content.type as Y.AbstractType<Json>;
      if (content instanceof Y.XmlText) {
        children.push(createSerializedLexicalElementNode(content));
      } else if (content instanceof Y.Map) {
        children.push(createSerializedLexicalMapNode(content as Y.Map<Json>));
      } else if (content instanceof Y.XmlElement) {
        children.push(
          createSerializedLexicalDecoratorNode(content as Y.XmlElement)
        );
      }
    }
    // ContentString is used to store text content of a text node in the Y.js doc.
    else if (start.content instanceof Y.ContentString) {
      if (children.length > 0) {
        const last = children[children.length - 1];
        if (last && last.group === "text") {
          last.text += start.content.str;
        }
      }
    }

    start = start.right;
  }

  return {
    type,
    attributes,
    children,
    group: "element",
  };
}

/**
 * Create a serialized Lexical root node.
 */
export function createSerializedLexicalRootNode(
  root: Y.XmlText
): SerializedLexicalRootNode {
  try {
    const children: Array<
      | SerializedLexicalElementNode<SerializedLexicalNode>
      | SerializedLexicalDecoratorNode
    > = [];
    let start = root._start;
    while (start !== null && start !== undefined) {
      // If the item is deleted, skip it.
      if (start.deleted) {
        start = start.right;
        continue;
      }

      if (start.content instanceof Y.ContentType) {
        const content = start.content.type as Y.AbstractType<Json>;

        // Immediate children of root must be XmlText (element nodes) or XmlElement (decorator nodes).
        if (content instanceof Y.XmlText) {
          children.push(createSerializedLexicalElementNode(content));
        } else if (content instanceof Y.XmlElement) {
          children.push(
            createSerializedLexicalDecoratorNode(content as Y.XmlElement)
          );
        }
      }

      start = start.right;
    }

    return {
      children,
      type: "root",
      attributes: root.getAttributes(),
    };
  } catch (err) {
    console.error(err);
    return {
      children: [],
      type: "root",
      attributes: root.getAttributes(),
    };
  }
}

/**
 * Convert a document as binaries to a
 * serialized lexical state
 */
export function getSerializedLexicalState({
  buffer,
  key,
}: {
  buffer: ArrayBuffer;
  key: string;
}): SerializedLexicalRootNode {
  const update = new Uint8Array(buffer);

  // Construct a Y.js document from the binary update
  const document = new Y.Doc();
  Y.applyUpdate(document, update);

  // Convert the Y.js document to a serializable Lexical state
  const root = document.get(key, Y.XmlText);
  const state = createSerializedLexicalRootNode(root);

  // Destroy the Y.js document after the conversion
  document.destroy();

  return state;
}

/**
 * Linebreaks in the `Lexical` world are equivalent to
 * hard breaks (like we can have in `tiptap`).
 * They are created by using keys like `shift+enter` or `mod+enter`.
 */
const isSerializedLineBreakNode = (
  node: SerializedLexicalNode
): node is SerializedLexicalLineBreakNode => {
  return node.group === "linebreak";
};

const isSerializedElementNode = (
  node: SerializedLexicalNode
): node is SerializedLexicalElementNode<Readonly<SerializedLexicalNode>> => {
  return node.group === "element" && node.children !== undefined;
};

const isEmptySerializedElementNode = (node: SerializedLexicalNode): boolean => {
  return isSerializedElementNode(node) && node.children.length === 0;
};

const isMentionNodeType = (type: string): type is "lb-mention" => {
  return type === "lb-mention";
};

const isMentionNodeAttributeType = (type: unknown): type is "lb-mention" => {
  return isString(type) && type === "lb-mention";
};

export const isSerializedMentionNode = (
  node: SerializedLexicalDecoratorNode
): node is SerializedLexicalMentionNode => {
  const attributes = node.attributes;

  return (
    isMentionNodeType(node.type) &&
    isMentionNodeAttributeType(attributes.__type) &&
    isMentionNodeAttributeId(attributes.__id) &&
    isString(attributes.__userId)
  );
};

const isGroupMentionNodeType = (type: string): type is "lb-group-mention" => {
  return type === "lb-group-mention";
};

const isGroupMentionNodeAttributeType = (
  type: unknown
): type is "lb-group-mention" => {
  return isString(type) && type === "lb-group-mention";
};

export const isSerializedGroupMentionNode = (
  node: SerializedLexicalDecoratorNode
): node is SerializedLexicalGroupMentionNode => {
  const attributes = node.attributes;

  return (
    isGroupMentionNodeType(node.type) &&
    isGroupMentionNodeAttributeType(attributes.__type) &&
    isMentionNodeAttributeId(attributes.__id) &&
    isString(attributes.__groupId) &&
    (attributes.__userIds === undefined || Array.isArray(attributes.__userIds))
  );
};

/**
 * Internal type helper when flattening nodes.
 * It helps to better extract mention node with context by marking
 * start and ends of paragraph and by handling specific use cases such as
 * using twice the `enter` key which will create an empty paragraph
 * at the first `enter`:
 *
 *  "
 *  Hey @charlie what's up?
 *  _enter_once_
 *  _enter_twice_
 *  "
 */
interface FlattenedLexicalElementNodeMarker {
  group: "element-marker";
  marker: "start" | "end";
}

const isFlattenedLexicalElementNodeMarker = (
  node: SerializedLexicalNode | FlattenedLexicalElementNodeMarker
): node is FlattenedLexicalElementNodeMarker => {
  return node.group === "element-marker";
};

/** @internal */
type FlattenedSerializedLexicalNodes = Array<
  SerializedLexicalNode | FlattenedLexicalElementNodeMarker
>;

/** @internal - export for testing only */
export const flattenLexicalTree = (
  nodes: SerializedLexicalNode[]
): FlattenedSerializedLexicalNodes => {
  let flattenNodes: FlattenedSerializedLexicalNodes = [];
  for (const node of nodes) {
    if (
      ["text", "linebreak", "decorator"].includes(node.group) ||
      isEmptySerializedElementNode(node)
    ) {
      flattenNodes = [...flattenNodes, node];
    } else if (node.group === "element") {
      flattenNodes = [
        ...flattenNodes,
        {
          group: "element-marker",
          marker: "start",
        },
        ...flattenLexicalTree(node.children),
        {
          group: "element-marker",
          marker: "end",
        },
      ];
    }
  }

  return flattenNodes;
};

/**
 * Lexical Mention Node with context
 */
export type LexicalMentionNodeWithContext = {
  before: SerializedLexicalNode[];
  after: SerializedLexicalNode[];
  mention: SerializedLexicalMentionNode | SerializedLexicalGroupMentionNode;
};

/**
 * Find a Lexical mention node
 * and returns it with contextual surrounding text
 */
export function findLexicalMentionNodeWithContext({
  root,
  mentionedId,
  textMentionId,
}: {
  root: SerializedLexicalRootNode;
  mentionedId: string;
  textMentionId: string;
}): LexicalMentionNodeWithContext | null {
  const nodes = flattenLexicalTree(root.children);

  // Find mention node
  let mentionNodeIndex = -1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (
      node.group === "decorator" &&
      (isSerializedMentionNode(node) || isSerializedGroupMentionNode(node)) &&
      node.attributes.__id === textMentionId &&
      ((node as SerializedLexicalMentionNode).attributes.__userId ===
        mentionedId ||
        (node as SerializedLexicalGroupMentionNode).attributes.__groupId ===
          mentionedId)
    ) {
      mentionNodeIndex = i;
      break;
    }
  }

  // No mention node found
  if (mentionNodeIndex === -1) {
    return null;
  }

  // Collect nodes before and after
  const mentionNode = nodes[mentionNodeIndex] as SerializedLexicalMentionNode;

  // Apply surrounding text guesses
  // For now let's stay simple just stop at nearest line break or element
  const beforeNodes: SerializedLexicalNode[] = [];
  const afterNodes: SerializedLexicalNode[] = [];

  // Nodes before mention node
  for (let i = mentionNodeIndex - 1; i >= 0; i--) {
    const node = nodes[i]!;

    // Stop if nodes are markers, line breaks or empty elements
    if (
      isFlattenedLexicalElementNodeMarker(node) ||
      isSerializedLineBreakNode(node)
    ) {
      break;
    }

    // Stop if decorator node isn't a mention
    if (node.group === "decorator" && !isMentionNodeType(node.type)) {
      break;
    }

    beforeNodes.unshift(node);
  }

  // Nodes after mention node
  for (let i = mentionNodeIndex + 1; i < nodes.length; i++) {
    const node = nodes[i]!;

    // Stop if nodes are markers, line breaks or empty elements
    if (
      isFlattenedLexicalElementNodeMarker(node) ||
      isSerializedLineBreakNode(node)
    ) {
      break;
    }

    // Stop if decorator node isn't a mention
    if (node.group === "decorator" && !isMentionNodeType(node.type)) {
      break;
    }

    afterNodes.push(node);
  }

  return {
    before: beforeNodes,
    after: afterNodes,
    mention: mentionNode,
  };
}
