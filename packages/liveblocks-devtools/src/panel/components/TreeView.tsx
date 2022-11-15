import type {
  JsonTreeNode,
  LiveListTreeNode,
  LiveMapTreeNode,
  LiveObjectTreeNode,
  StorageTreeNode,
  TreeNode,
  UserTreeNode,
} from "@liveblocks/core";
import type { NodeRendererProps, TreeApi } from "react-arborist";
import { Tree as ArboristTree } from "react-arborist";

import { assertNever } from "../../lib/assert";
import { truncate } from "../../lib/truncate";

function icon(node: StorageTreeNode | UserTreeNode): string {
  switch (node.type) {
    case "LiveObject":
      return "📦";

    case "LiveList":
      return "📜";

    case "LiveMap":
      return "🗺️";

    case "User":
      return "🤓";

    case "Json":
      return "🔑";

    default:
      return assertNever(node, "Unhandled node type in icon()");
  }
}

/**
 * Function that helps construct a "preview" string for a collapsed node.
 */
function summarize(node: StorageTreeNode | UserTreeNode): string {
  switch (node.type) {
    case "LiveObject":
      return node.fields
        .map(
          (f) =>
            `${f.key}=${String(
              f.type === "Json" &&
                (f.value === null || typeof f.value !== "object")
                ? f.value
                : "…"
            )}`
        )
        .join(", ");

    case "LiveList":
      return `${node.items.length} items`;

    case "LiveMap":
      return `${node.entries.length} entries`;

    case "User":
      return node.presence
        .map((p) => `${p.key}=${JSON.stringify(p.value)}`)
        .join(", ");

    case "Json":
      return JSON.stringify(node.value);

    default:
      return assertNever(node, "Unhandled node type in summarize()");
  }
}

function UserNodeRenderer({ node, style }: NodeRendererProps<UserTreeNode>) {
  return (
    <div
      className="space-x-2"
      style={style}
      // ref={dragHandle}
      onClick={() => node.toggle()}
    >
      <span>{icon(node.data)}</span>
      <span className="space-x-3">
        <span>{node.data.key}</span>

        {node.data.info ? (
          <span className="text-gray-500">
            {JSON.stringify(node.data.info, null, 2)}
          </span>
        ) : null}

        {node.isOpen ? (
          <span>(conn #{node.data.id})</span>
        ) : (
          <span className="text-gray-500">
            {truncate(summarize(node.data), 42)}
          </span>
        )}
      </span>
    </div>
  );
}

function LiveNodeRenderer({
  node,
  style,
}: NodeRendererProps<LiveListTreeNode | LiveMapTreeNode | LiveObjectTreeNode>) {
  return (
    <div
      className="space-x-2"
      style={style}
      // ref={dragHandle}
      onClick={() => node.toggle()}
    >
      <span>{icon(node.data)}</span>
      <span className="space-x-3">
        <span>{node.data.key}</span>
        {node.isOpen ? (
          <span className="text-xs text-gray-600">({node.data.type})</span>
        ) : (
          <span className="text-gray-500">
            {truncate(summarize(node.data))}
          </span>
        )}
      </span>
    </div>
  );
}

function JsonNodeRenderer({ node, style }: NodeRendererProps<JsonTreeNode>) {
  const value = JSON.stringify(node.data.value);
  return (
    <div
      className="space-x-2"
      style={style}
      // ref={dragHandle}
    >
      <span>{icon(node.data)}</span>
      <span className="space-x-3">
        <span>{node.data.key}</span>
        <span className="text-gray-500">
          {node.isFocused ? value : truncate(value)}
        </span>
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
    <LiveNodeRenderer
      {...(props as NodeRendererProps<
        LiveListTreeNode | LiveMapTreeNode | LiveObjectTreeNode
      >)}
    />
  ) : props.node.data.type === "LiveList" ? (
    <LiveNodeRenderer
      {...(props as NodeRendererProps<
        LiveListTreeNode | LiveMapTreeNode | LiveObjectTreeNode
      >)}
    />
  ) : props.node.data.type === "LiveObject" ? (
    <LiveNodeRenderer
      {...(props as NodeRendererProps<
        LiveListTreeNode | LiveMapTreeNode | LiveObjectTreeNode
      >)}
    />
  ) : (
    <JsonNodeRenderer {...(props as NodeRendererProps<JsonTreeNode>)} />
  );
}

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
      // XXX Should we use `[]` here instead of `null`?
      return null as unknown as TreeNode[];

    default:
      return assertNever(node, "Unhandled node type");
  }
}

type TreeProps<T> = TreeApi<T>["props"];

export function Tree(
  props: TreeProps<StorageTreeNode | UserTreeNode> &
    React.RefAttributes<TreeApi<StorageTreeNode | UserTreeNode> | undefined>
): React.ReactElement {
  return (
    <ArboristTree childrenAccessor={childrenAccessor} {...props}>
      {TreeNodeRenderer}
    </ArboristTree>
  );
}
