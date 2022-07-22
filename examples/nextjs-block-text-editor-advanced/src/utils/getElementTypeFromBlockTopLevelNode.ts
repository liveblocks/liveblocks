import { BlockTopLevelNode, BlockNodeType } from "../types";

const getElementTypeFromBlockTopLevelNode = (
  blockNode: BlockTopLevelNode
): string => {
  switch (blockNode.type) {
    case BlockNodeType.HeadingOne:
      return "h1";
    case BlockNodeType.HeadingTwo:
      return "h2";
    case BlockNodeType.HeadingThree:
      return "h3";
    default:
    case BlockNodeType.Paragraph:
      return "p";
  }
};

export default getElementTypeFromBlockTopLevelNode;
