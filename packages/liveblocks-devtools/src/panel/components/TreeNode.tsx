import type { TreeApi, NodeRendererProps } from "react-arborist";
import { Tree as ArboristTree } from "react-arborist";
import type {
  JsonTreeNode,
  LiveListTreeNode,
  LiveMapTreeNode,
  LiveObjectTreeNode,
  StorageTreeNode,
  TreeNode,
  UserTreeNode,
} from "@liveblocks/core";
import { assertNever } from "@liveblocks/core";

// XXX Factor out as helper method
// function truncate(s: string): string {
//   return s.length > 24 ? s.substring(0, 24) + "..." : s;
// }

function UserNodeRenderer({ node, style }: NodeRendererProps<UserTreeNode>) {
  return (
    <div
      style={style}
      // ref={dragHandle}
    >
      <span className="space-x-3">
        {"🙎‍♂️"} {node.data.key} (connection #{node.data.id})
      </span>
      {node.data.info ? (
        <div className="text-gray-500">
          {JSON.stringify(node.data.info, null, 2)}
        </div>
      ) : null}
    </div>
  );
}

function LiveNodeRenderer({
  node,
  style,
}: NodeRendererProps<LiveListTreeNode | LiveMapTreeNode | LiveObjectTreeNode>) {
  const icon =
    node.data.type === "LiveMap"
      ? "🗺️"
      : node.data.type === "LiveObject"
      ? "📦"
      : node.data.type === "LiveList"
      ? "📜"
      : "🔑";
  return (
    <div
      className="space-x-2"
      style={style}
      // ref={dragHandle}
      onClick={() => node.toggle()}
    >
      <span>{icon}</span>
      <span className="space-x-3">
        <span>{node.data.key}</span>
        <span>({node.data.type})</span>
      </span>
    </div>
  );
}

function JsonNodeRenderer({ node, style }: NodeRendererProps<JsonTreeNode>) {
  return (
    <div
      style={style}
      // ref={dragHandle}
    >
      <span className="space-x-3">
        <span>{node.data.key}</span>
        <span className="text-gray-500">{JSON.stringify(node.data.value)}</span>
      </span>
    </div>
  );
}

function TreeNodeRenderer(
  props: NodeRendererProps<StorageTreeNode | UserTreeNode>
) {
  return props.node.data.type === "User" ? (
    <UserNodeRenderer {...(props as NodeRendererProps<UserTreeNode>)} />
  ) : props.node.data.type === "LiveMap" ? (
    <LiveNodeRenderer {...(props as NodeRendererProps<LiveMapTreeNode>)} />
  ) : props.node.data.type === "LiveList" ? (
    <LiveNodeRenderer {...(props as NodeRendererProps<LiveListTreeNode>)} />
  ) : props.node.data.type === "LiveObject" ? (
    <LiveNodeRenderer {...(props as NodeRendererProps<LiveObjectTreeNode>)} />
  ) : (
    <JsonNodeRenderer {...(props as NodeRendererProps<JsonTreeNode>)} />
  );
}

// function idAccessor(node: StorageTreeNode | UserTreeNode): string {
//   return node.id;
// }

function childrenAccessor(node: TreeNode): TreeNode[] {
  switch (node.type) {
    case "LiveList":
      return node.items;

    case "LiveMap":
      return node.entries;

    case "LiveObject":
      return node.fields;

    case "User":
      return node.presence;

    case "Json":
      throw new Error("Json nodes cannot have children");

    default:
      return assertNever(node, "Unhandled node type");
  }
}

type TreeProps<T> = TreeApi<T>["props"];

export function Tree(
  props: TreeProps<StorageTreeNode | UserTreeNode> &
    React.RefAttributes<TreeApi<StorageTreeNode | UserTreeNode> | undefined>
): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null {
  const { children, ...rest } = props;
  return (
    <ArboristTree
      // idAccessor={idAccessor}
      childrenAccessor={childrenAccessor}
      {...rest}
    >
      {TreeNodeRenderer}
    </ArboristTree>
  );
}
