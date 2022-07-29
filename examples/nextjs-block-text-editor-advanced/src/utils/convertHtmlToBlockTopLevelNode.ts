import { BlockTopLevelNode, BlockTopLevelNodeType } from "../types";
import convertNodeChildrenToBlockNode from "./convertNodeChildrenToBlockNode";

const convertHtmlToBlockTopLevelNode = (
  type: BlockTopLevelNodeType,
  html: string
): BlockTopLevelNode => {
  const range = document.createRange();
  const fragment = range.createContextualFragment(html);
  const children = convertNodeChildrenToBlockNode(fragment);

  return {
    type,
    children,
  };
};

export default convertHtmlToBlockTopLevelNode;
