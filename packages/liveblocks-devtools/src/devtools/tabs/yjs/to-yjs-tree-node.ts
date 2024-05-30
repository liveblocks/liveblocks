import type {
  YAbstractTypeNode,
  YContentAnyNode,
  YContentBinaryNode,
  YContentEmbedNode,
  YContentFormatNode,
  YContentNode,
  YContentStringNode,
  YDocNode,
  YTopAbstractTypeNode,
} from "./to-y-node";

export type YDocTreeNode = {
  type: "Y.Doc";
  id: string;
  guid: string;
  key: string;
  payload: YTopAbstractTypeTreeNode[];
};

export type YTopAbstractTypeTreeNode = {
  type: YTopAbstractTypeNode["type"];
  id: string;
  key: string;
  payload: (
    | YDocTreeNode
    | YAbstractTypeTreeNode
    | YContentTreeNode
    | YTopAbstractTypeTreeNode
  )[];
};

export type YAbstractTypeTreeNode = {
  type: YAbstractTypeNode["type"];
  id: string;
  key: string;
  payload: (
    | YDocTreeNode
    | YAbstractTypeTreeNode
    | YContentTreeNode
    | YTopAbstractTypeTreeNode
  )[];
};

export type YContentStringTreeNode = {
  type: YContentStringNode["type"];
  id: string;
  key: string;
  payload: string;
};

export type YContentEmbedTreeNode = {
  type: YContentEmbedNode["type"];
  id: string;
  key: string;
  payload: Object;
};

export type YContentBinaryTreeNode = {
  type: YContentBinaryNode["type"];
  id: string;
  key: string;
  payload: Uint8Array;
};

export type YContentFormatTreeNode = {
  type: YContentFormatNode["type"];
  id: string;
  key: string;
  payload: Object;
};

export type YContentAnyTreeNode = {
  type: YContentAnyNode["type"];
  id: string;
  key: string;
  payload: (Number | Object | Boolean | Array<unknown> | String)[];
};

export type YContentTreeNode =
  | YContentStringTreeNode
  | YContentEmbedTreeNode
  | YContentBinaryTreeNode
  | YContentFormatTreeNode
  | YContentAnyTreeNode;

export type YTreeNode =
  | YDocTreeNode
  | YAbstractTypeTreeNode
  | YContentTreeNode
  | YTopAbstractTypeTreeNode;

export function toTreeYNode(
  node: YDocNode,
  key?: string,
  parentId?: string
): YDocTreeNode;

export function toTreeYNode(
  node: YTopAbstractTypeNode,
  key?: string,
  parentId?: string
): YTopAbstractTypeTreeNode;

export function toTreeYNode(
  node: YAbstractTypeNode,
  key?: string,
  parentId?: string
): YAbstractTypeTreeNode;

export function toTreeYNode(
  node: YContentStringNode,
  key?: string,
  parentId?: string
): YContentStringTreeNode;

export function toTreeYNode(
  node: YContentEmbedNode,
  key?: string,
  parentId?: string
): YContentEmbedTreeNode;

export function toTreeYNode(
  node: YContentBinaryNode,
  key?: string,
  parentId?: string
): YContentBinaryTreeNode;

export function toTreeYNode(
  node: YContentFormatNode,
  key?: string,
  parentId?: string
): YContentFormatTreeNode;

export function toTreeYNode(
  node: YContentAnyNode,
  key?: string,
  parentId?: string
): YContentAnyTreeNode;

export function toTreeYNode(
  node: YDocNode | YTopAbstractTypeNode | YAbstractTypeNode | YContentNode,
  key = "0",
  parentId = ""
):
  | YDocTreeNode
  | YTopAbstractTypeTreeNode
  | YAbstractTypeTreeNode
  | YContentTreeNode {
  const id = createTreeNodeId(key, parentId);

  switch (node.type) {
    case "Y.Doc":
      return {
        type: node.type,
        id,
        guid: node.guid,
        key,
        payload: Object.entries(node.data).map(([key, value]) =>
          toTreeYNode(value, key, id)
        ),
      };
    case "Y.AbstractType":
      return {
        type: node.type,
        id,
        key,
        payload: Object.entries(node.data).map(([key, value]) => {
          switch (value.type) {
            case "Y.Doc":
              return toTreeYNode(value, key, id);
            case "Y.Map":
            case "Y.Array":
            case "Y.XmlFragment":
            case "Y.XmlElement":
            case "Y.Text":
            case "Y.XmlText":
              return toTreeYNode(value, key, id);
            case "Y.ContentBinary":
              return toTreeYNode(value, key, id);
            case "Y.ContentAny":
              return toTreeYNode(value, key, id);
            case "Y.ContentFormat":
              return toTreeYNode(value, key, id);
            case "Y.ContentString":
              return toTreeYNode(value, key, id);
            case "Y.ContentEmbed":
              return toTreeYNode(value, key, id);
            case "Y.AbstractType":
              return toTreeYNode(value, key, id);
          }
        }),
      };
    case "Y.Map":
    case "Y.Array":
    case "Y.XmlFragment":
    case "Y.XmlElement":
    case "Y.Text":
    case "Y.XmlText":
      return {
        type: node.type,
        id,
        key,
        payload: Object.entries(node.data).map(([key, value]) => {
          switch (value.type) {
            case "Y.Doc":
              return toTreeYNode(value, key, id);
            case "Y.Map":
            case "Y.Array":
            case "Y.XmlFragment":
            case "Y.XmlElement":
            case "Y.Text":
            case "Y.XmlText":
              return toTreeYNode(value, key, id);
            case "Y.ContentBinary":
              return toTreeYNode(value, key, id);
            case "Y.ContentAny":
              return toTreeYNode(value, key, id);
            case "Y.ContentFormat":
              return toTreeYNode(value, key, id);
            case "Y.ContentString":
              return toTreeYNode(value, key, id);
            case "Y.ContentEmbed":
              return toTreeYNode(value, key, id);
            case "Y.AbstractType":
              return toTreeYNode(value, key, id);
          }
        }),
      };
    case "Y.ContentAny":
      return {
        type: node.type,
        id,
        key,
        payload: node.data,
      };
    case "Y.ContentBinary":
      return {
        type: node.type,
        id,
        key,
        payload: node.data,
      };
    case "Y.ContentFormat":
      return {
        type: node.type,
        id,
        key,
        payload: node.data,
      };
    case "Y.ContentString":
      return {
        type: node.type,
        id,
        key,
        payload: node.data,
      };
    case "Y.ContentEmbed":
      return {
        type: node.type,
        id,
        key,
        payload: node.data,
      };
  }
}

export function createTreeNodeId(id: string, parentId?: string) {
  return parentId ? `${parentId}:${id}` : id;
}
