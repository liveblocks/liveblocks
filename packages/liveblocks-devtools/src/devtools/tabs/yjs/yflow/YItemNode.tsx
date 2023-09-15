import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import * as Y from "yjs";

import ContentAny from "./ContentAny";
import ContentBinary from "./ContentBinary";
import ContentDeleted from "./ContentDeleted";
import ContentEmbed from "./ContentEmbed";
import ContentFormat from "./ContentFormat";
import ContentJSON from "./ContentJSON";
import ContentString from "./ContentString";
import ContentType from "./ContentType";

type NodeData = {
  label: string;
  item: Y.Item;
  setSelectedNode: (node: string) => void;
  isNodeSelected: boolean;
};

function YItemNode({ data }: NodeProps<NodeData>) {
  let component = null;

  switch (true) {
    case data.item.content instanceof Y.ContentDeleted:
      component = (
        <ContentDeleted content={data.item.content as Y.ContentDeleted} />
      );
      break;
    case data.item.content instanceof Y.ContentString:
      component = (
        <ContentString content={data.item.content as Y.ContentString} />
      );
      break;
    case data.item.content instanceof Y.ContentFormat:
      component = (
        <ContentFormat content={data.item.content as Y.ContentFormat} />
      );
      break;
    case data.item.content instanceof Y.ContentJSON:
      component = (
        <ContentJSON content={data.item.content as Y.ContentJSON} />
      );
      break;
    case data.item.content instanceof Y.ContentAny:
      component = (
        <ContentAny content={data.item.content as Y.ContentAny} />
      );
      break;
    case data.item.content instanceof Y.ContentType:
      component = (
        <ContentType content={data.item.content as Y.ContentType} />
      );
      break;
    case data.item.content instanceof Y.ContentBinary:
      component = (
        <ContentBinary content={data.item.content as Y.ContentBinary} />
      );
      break;
    case data.item.content instanceof Y.ContentEmbed:
      component = (
        <ContentEmbed content={data.item.content as Y.ContentEmbed} />
      );
      break;
    default:
      { data.item.content.getContent.toString() }

  }

  const onSelect = () => {
    data.setSelectedNode(`item-${data.item.id.client}-${data.item.id.clock}`);
  };

  const classnames = `y-item-node${data.isNodeSelected ? " selected" : ""}`;

  return (
    <div className={classnames} onClick={onSelect}>
      <Handle type="target" id="top" position={Position.Top} />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        style={{ top: 10, background: "#555" }}
      />
      <Handle
        type="target"
        id="right"
        position={Position.Right}
        style={{ top: 10, background: "#555" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ bottom: 10, background: "pink" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        style={{ bottom: 10, background: "green" }}
        id="left"
      />
      <h2>{data.item.id.clock}</h2>
      {data.item.info}
      {component}
    </div>
  );
}

export default YItemNode;
