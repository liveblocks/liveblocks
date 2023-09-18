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
import FallbackContent from "./FallbackContent";

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
      component = <ContentJSON content={data.item.content as Y.ContentJSON} />;
      break;
    case data.item.content instanceof Y.ContentAny:
      component = <ContentAny content={data.item.content as Y.ContentAny} />;
      break;
    case data.item.content instanceof Y.ContentType:
      component = <ContentType content={data.item.content as Y.ContentType} />;
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
    default: {
      component = <FallbackContent content={data.item.content} />;
      break;
    }
  }

  const onSelect = () => {
    data.setSelectedNode(`item-${data.item.id.client}-${data.item.id.clock}`);
  };

  return (
    <div
      className="absolute inset-0 p-3"
      data-selected={data.isNodeSelected ? "" : undefined}
      onClick={onSelect}
    >
      <Handle type="target" id="top" position={Position.Top} />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        style={{ top: 12, background: "#555" }}
      />
      <Handle
        type="target"
        id="right"
        position={Position.Right}
        style={{ top: 12, background: "#555" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ top: 36, background: "pink" }}
        data-type="color"
      />
      <Handle
        type="source"
        position={Position.Left}
        style={{ top: 36, background: "green" }}
        id="left"
        data-type="color"
      />
      {component}
    </div>
  );
}

export default YItemNode;
