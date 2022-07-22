import { BlockTopLevelNode, BlockNodeType } from "../types";

const isBlockTopLevelNodeEmpty = (node: BlockTopLevelNode) => {
  return (
    !node.children.length ||
    (node.children[0].type === BlockNodeType.Text &&
      node.children[0].text === "")
  );
};

export default isBlockTopLevelNodeEmpty;
