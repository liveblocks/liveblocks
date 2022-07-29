import { BlockNode, BlockNodeType } from "../types";
import parseHtml from "./parseHtml";
import wrapHtmlByBlockNodeType from "./wrapHtmlByBlockNodeType";

const convertBlockNodeToHtml = (blockNode: BlockNode): string => {
  let html = "";

  if (blockNode.type === BlockNodeType.Text) {
    html = parseHtml(blockNode.text);
    return html;
  }

  if (blockNode.type === BlockNodeType.Br) {
    html = "<br>";
    return html;
  }

  for (let i = 0; i < blockNode.children.length; i++) {
    const childNode = blockNode.children[i];

    html += wrapHtmlByBlockNodeType(
      blockNode.type,
      convertBlockNodeToHtml(childNode)
    );
  }

  return html;
};

export default convertBlockNodeToHtml;
