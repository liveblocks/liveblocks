import type { Json, JsonObject } from "@liveblocks/core";
import * as Y from "yjs";

export interface SerializedBaseLexicalNode {
  type: string;
  attributes: JsonObject;
}

export interface SerializedTextNode extends SerializedBaseLexicalNode {
  text: string;
  group: "text";
}

export interface SerializedElementNode<T extends SerializedBaseLexicalNode>
  extends SerializedBaseLexicalNode {
  children: Array<T>;
  group: "element";
}

export interface SerializedDecoratorNode extends SerializedBaseLexicalNode {
  group: "decorator";
}

export interface SerializedMentionNode extends SerializedDecoratorNode {
  type: "lb-mention";
  attributes: {
    __id: string;
    __type: "lb-mention";
    __userId: string;
  };
}

export interface SerializedLineBreakNode extends SerializedBaseLexicalNode {
  group: "line-break";
}

export type SerializedLexicalNode =
  | SerializedTextNode
  | SerializedLineBreakNode
  | SerializedDecoratorNode
  | SerializedElementNode<SerializedLexicalNode>;

export type SerializedLexicalRootNodeChildren = Array<
  Readonly<
    | SerializedElementNode<Readonly<SerializedLexicalNode>>
    | SerializedDecoratorNode
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
): SerializedTextNode | SerializedLineBreakNode {
  const type = item.get("__type");
  if (typeof type !== "string") {
    throw new Error(
      `Expected ${item.constructor.name} to include type attribute`
    );
  }

  // Y.Map in Lexical stores all attributes defined in Lexical TextNode and LineBreakNode class.
  const attributes = Object.fromEntries(item.entries());
  if (type === "line-break") {
    return {
      type,
      attributes,
      group: "line-break",
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
): SerializedDecoratorNode {
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
): SerializedElementNode<SerializedLexicalNode> {
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
        children.push(createSerializedLexicalMapNode(content));
      } else if (content instanceof Y.XmlElement) {
        children.push(createSerializedLexicalDecoratorNode(content));
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
      SerializedElementNode<SerializedLexicalNode> | SerializedDecoratorNode
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
          children.push(createSerializedLexicalDecoratorNode(content));
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
  const root = document.get(key, Y.XmlText);
  Y.applyUpdate(document, update);

  // Convert the Y.js document to a serializable Lexical state
  const state = createSerializedLexicalRootNode(root);

  // Destroy the Y.js document after the conversion
  document.destroy();

  return state;
}

/** @internal */
const flattenLexicalTree = (
  nodes: SerializedLexicalNode[]
): SerializedLexicalNode[] => {
  let flattenNodes: SerializedLexicalNode[] = [];
  for (const node of nodes) {
    if (["text", "line-break", "decorator"].includes(node.group)) {
      flattenNodes = [...flattenNodes, node];
    } else if (node.group === "element") {
      flattenNodes = [...flattenNodes, ...flattenLexicalTree(node.children)];
    }
  }

  return flattenNodes;
};

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

const assertMentionNodeType = (type: string): type is "lb-mention" => {
  return type === "lb-mention";
};

const assertMentionNodeAttributeType = (
  type: unknown
): type is "lb-mention" => {
  return isString(type) && type === "lb-mention";
};

const assertMentionNodeAttributeId = (
  value: unknown
): value is `in_${string}` => {
  return isString(value) && value.startsWith("in_");
};

export const assertSerializedMentionNode = (
  node: SerializedDecoratorNode
): node is SerializedMentionNode => {
  const attributes = node.attributes;

  return (
    assertMentionNodeType(node.type) &&
    assertMentionNodeAttributeType(attributes.__type) &&
    assertMentionNodeAttributeId(attributes.__id) &&
    isString(attributes.__userId)
  );
};

/**
 * Lexical Mention Node with context
 */
export type LexicalMentionNodeWithContext = {
  before: SerializedLexicalNode[];
  after: SerializedLexicalNode[];
  mention: SerializedMentionNode;
};

/**
 * Find a Lexical mention node
 * and returns it with contextual surrounding text
 */
export function findLexicalMentionNodeWithContext({
  root,
  mentionedUserId,
  mentionId,
}: {
  root: SerializedLexicalRootNode;
  mentionedUserId: string;
  mentionId: string;
}): LexicalMentionNodeWithContext | null {
  const nodes = flattenLexicalTree(root.children);

  // Find mention node
  let mentionNodeIndex = -1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (
      node.group === "decorator" &&
      assertSerializedMentionNode(node) &&
      node.attributes.__id === mentionId &&
      node.attributes.__userId === mentionedUserId
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
  const mentionNode = nodes[mentionNodeIndex] as SerializedMentionNode;

  // TODO: apply surrounding text guesses
  // For now let's stay simple just stop at nearest line break or element
  const beforeNodes: SerializedLexicalNode[] = [];
  const afterNodes: SerializedLexicalNode[] = [];

  // Nodes before mention node
  for (let i = mentionNodeIndex - 1; i >= 0; i--) {
    const node = nodes[i]!;

    // Stop if nodes are line breaks or element
    if (["line-break", "element"].includes(node.group)) {
      break;
    }

    // Stop if decorator node isn't a mention
    if (node.group === "decorator" && !assertMentionNodeType(node.type)) {
      break;
    }

    beforeNodes.unshift(node);
  }

  // Node after mention node
  for (let i = mentionNodeIndex + 1; i < nodes.length; i++) {
    const node = nodes[i]!;

    // Stop if nodes are line breaks or element
    if (["line-break", "element"].includes(node.group)) {
      break;
    }

    // Stop if decorator node isn't a mention
    if (node.group === "decorator" && !assertMentionNodeType(node.type)) {
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
