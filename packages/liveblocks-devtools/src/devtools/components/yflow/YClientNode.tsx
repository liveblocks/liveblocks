import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import * as Y from "yjs";

import ContentDeleted from "./ContentDeleted";
import ContentString from "./ContentString";

type NodeData = {
  label: string;
  item: Y.Item;
};

function YClientNode({ data }: NodeProps<NodeData>) {
  let component = null;
  {
    switch (true) {
      case data.item.content instanceof Y.ContentDeleted:
        component = <ContentDeleted content={data.item.content as Y.ContentDeleted} />
        break;
      case data.item.content instanceof Y.ContentString:
        component = <ContentString content={data.item.content as Y.ContentString} />
        break;
    }
  }

  return <div className="y-item-node">
    <Handle type="target" position={Position.Top} />
    <h2>{data.item.id.client}:{data.item.id.clock}</h2>
    {component}
  </div>;
}

export default YClientNode;
