import { Handle, NodeProps, Position } from "reactflow";
import * as Y from "yjs";
import ContentDeleted from "./ContentDeleted";
import ContentString from "./ContentString";
import ContentFormat from "./ContentFormat";

type NodeData = {
  label: string;
  item: Y.Item;
  setSelectedNode: (node: string) => void;
  isNodeSelected: boolean;
};

function YItemNode({ data }: NodeProps<NodeData>) {
  let component = null;
  {
    switch (true) {
      case data.item.content instanceof Y.ContentDeleted:
        component = <ContentDeleted content={data.item.content as Y.ContentDeleted} />
        break;
      case data.item.content instanceof Y.ContentString:
        component = <ContentString content={data.item.content as Y.ContentString} />
        break;
      case data.item.content instanceof Y.ContentFormat:
        component = <ContentFormat content={data.item.content as Y.ContentFormat} />
        break;
    }
  }

  const onSelect = () => {
    data.setSelectedNode(`item-${data.item.id.client}-${data.item.id.clock}`);
  }

  const classnames = `y-item-node${data.isNodeSelected ? ' selected' : ''}`

  return <div className={classnames} onClick={onSelect}>
    <Handle type="target" id="top" position={Position.Top} />
    <Handle type="target" id="left" position={Position.Left}
      style={{ top: 10, background: '#555' }} />
    <Handle type="target" id="right" position={Position.Right}
      style={{ top: 10, background: '#555' }} />
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      style={{ bottom: 10, background: 'pink' }}
    />
    <Handle
      type="source"
      position={Position.Left}
      style={{ bottom: 10, background: 'green' }}
      id="left"
    />
    <h2>{data.item.id.clock}</h2>
    {data.item.info}
    {component}
  </div>;
}

export default YItemNode;
