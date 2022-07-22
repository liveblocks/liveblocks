import { BlockNode } from "../types";
import convertNodeToBlockNode from "./convertNodeToBlockNode";

const convertNodeChildrenToBlockNode = (
  node: Node | DocumentFragment
): BlockNode[] => {
  const nodes: BlockNode[] = [];

  for (let i = 0; i < node.childNodes.length; i++) {
    const childNode = node.childNodes[i];
    if (childNode) {
      nodes.push(convertNodeToBlockNode(childNode));
    }
  }

  return nodes;
};

export default convertNodeChildrenToBlockNode;
