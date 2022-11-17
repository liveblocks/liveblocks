import type {
  JsonTreeNode,
  LiveListTreeNode,
  LiveMapTreeNode,
  LiveObjectTreeNode,
  StorageTreeNode,
  TreeNode,
  UserTreeNode,
} from "@liveblocks/core";
import cx from "classnames";
import type {
  ComponentProps,
  MouseEvent,
  ReactElement,
  RefAttributes,
} from "react";
import { forwardRef, useCallback, useMemo } from "react";
import type { NodeApi, NodeRendererProps, TreeApi } from "react-arborist";
import { Tree as ArboristTree } from "react-arborist";
import useResizeObserver from "use-resize-observer";

import { assertNever } from "../../lib/assert";
import { mergeRefs } from "../../lib/mergeRefs";
import { truncate } from "../../lib/truncate";

const PADDING = 6;
const ROW_HEIGHT = 26;
const ROW_INDENT = 18;

type ArboristTreeProps<T> = TreeApi<T>["props"];

type TreeProps = Pick<ComponentProps<"div">, "className" | "style"> &
  ArboristTreeProps<StorageTreeNode | UserTreeNode> &
  RefAttributes<TreeApi<StorageTreeNode | UserTreeNode> | undefined>;

interface RowProps extends ComponentProps<"div"> {
  node: NodeApi;
}

interface BreadcrumbsProps extends ComponentProps<"div"> {
  nodes: NodeApi[];
  onNodeClick: (node: NodeApi) => void;
}

interface AutoSizerProps extends Omit<ComponentProps<"div">, "children"> {
  children: (dimensions: { width: number; height: number }) => ReactElement;
}

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
          (node) =>
            `${node.key}=${String(
              node.type === "Json" &&
                (node.value === null || typeof node.value !== "object")
                ? node.value
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

function toggleNode<T>(node: NodeApi<T>, options: { siblings: boolean }): void {
  if (options.siblings) {
    const siblings = node.parent?.children;

    if (siblings) {
      if (node.isOpen) {
        siblings.forEach((sibling) => sibling.close());
      } else {
        siblings.forEach((sibling) => sibling.open());
      }
    }
  } else {
    node.toggle();
  }
}

export function recursivelyGetParentNodes<T>(
  node: NodeApi<T>,
  parents: NodeApi<T>[] = []
): NodeApi<T>[] {
  return node.parent && !node.parent.isRoot
    ? recursivelyGetParentNodes(node.parent, [...parents, node.parent])
    : parents;
}

function Row({ node, children, className, ...props }: RowProps) {
  const parents = useMemo(() => recursivelyGetParentNodes(node), [node]);
  const hasFocusedParent = useMemo(
    () => parents.some((parent) => parent.isFocused),
    [parents]
  );

  return (
    <div
      className={cx(
        className,
        "flex h-full items-center gap-2 rounded pr-2",
        node.isFocused
          ? "bg-gray-200 dark:bg-gray-700"
          : hasFocusedParent
          ? "bg-gray-100 dark:bg-gray-800"
          : "bg-transparent",
        node.isOpen && "rounded-b-none",
        hasFocusedParent && "rounded-none"
      )}
      {...props}
    >
      <div className="ml-2 flex h-[8px] w-[8px] items-center justify-center">
        {node.isInternal && (
          <svg
            width="8"
            height="8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cx("transition-transform", node.isOpen && "rotate-90")}
          >
            <path
              d="M2 6.117V1.883a.5.5 0 0 1 .757-.429l3.528 2.117a.5.5 0 0 1 0 .858L2.757 6.546A.5.5 0 0 1 2 6.116Z"
              className="fill-gray-400 dark:fill-gray-500"
            />
          </svg>
        )}
      </div>
      <div className="flex h-[16px] w-[16px] content-center items-center">
        {icon(node.data)}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-[inherit]">
        {children}
      </div>
    </div>
  );
}

function UserNodeRenderer({ node, style }: NodeRendererProps<UserTreeNode>) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) =>
      toggleNode(node, { siblings: event.altKey }),
    []
  );

  return (
    <Row node={node} style={style} onClick={handleClick}>
      <div className="flex-none">{node.data.key}</div>
      {node.isOpen ? (
        <div className="text-gray-500 dark:text-gray-400">
          (#{node.data.id})
        </div>
      ) : (
        <div className="truncate text-gray-500 dark:text-gray-400">
          {truncate(summarize(node.data))}
        </div>
      )}
    </Row>
  );
}

function LiveNodeRenderer({
  node,
  style,
}: NodeRendererProps<LiveListTreeNode | LiveMapTreeNode | LiveObjectTreeNode>) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) =>
      toggleNode(node, { siblings: event.altKey }),
    []
  );

  return (
    <Row node={node} style={style} onClick={handleClick}>
      <div className="flex-none">{node.data.key}</div>
      {node.isOpen ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          ({node.data.type})
        </div>
      ) : (
        <div className="truncate text-gray-500 dark:text-gray-400">
          {truncate(summarize(node.data))}
        </div>
      )}
    </Row>
  );
}

function JsonNodeRenderer({ node, style }: NodeRendererProps<JsonTreeNode>) {
  const value = JSON.stringify(node.data.value);

  return (
    <Row node={node} style={style}>
      <div className="flex-none">{node.data.key}</div>
      <div className="truncate text-gray-500 dark:text-gray-400">
        {node.isFocused ? value : truncate(value)}
      </div>
    </Row>
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
      // XXX This works, but the types of react-arborist don't correctly
      // reflect this reality. I've made a PR for this. When they publish this
      // fix, we can get rid of this hack. See
      // https://github.com/brimdata/react-arborist/pull/65
      return null as unknown as TreeNode[];

    default:
      return assertNever(node, "Unhandled node type");
  }
}

const autoSizerStyle = {
  flex: 1,
  width: "100%",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
};

const AutoSizer = forwardRef<HTMLDivElement, AutoSizerProps>(
  ({ children, style, ...props }, forwardRef) => {
    const { ref, width, height } = useResizeObserver();

    return (
      <div
        style={{ ...autoSizerStyle, ...style }}
        ref={mergeRefs(ref, forwardRef)}
        {...props}
      >
        {width && height ? children({ width, height }) : null}
      </div>
    );
  }
);

export const Tree = forwardRef<TreeApi<TreeNode>, TreeProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <AutoSizer
        className={className}
        style={{ ...style, paddingLeft: PADDING, paddingRight: PADDING }}
      >
        {({ width, height }) => (
          <ArboristTree
            ref={ref}
            width={width}
            height={height}
            childrenAccessor={childrenAccessor}
            disableDrag
            disableDrop
            selectionFollowsFocus
            rowHeight={ROW_HEIGHT}
            indent={ROW_INDENT}
            padding={PADDING}
            {...props}
          >
            {TreeNodeRenderer}
          </ArboristTree>
        )}
      </AutoSizer>
    );
  }
);

export function Breadcrumbs({
  nodes = [],
  onNodeClick,
  className,
  ...props
}: BreadcrumbsProps) {
  return (
    <div
      className={cx(
        className,
        "flex h-8 items-center gap-1.5 overflow-x-auto border-t border-gray-200 bg-white px-2.5 dark:border-gray-600 dark:bg-gray-900"
      )}
      {...props}
    >
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;

        const handleClick = () => {
          onNodeClick(node);
        };

        return (
          <>
            <button
              key={node.data.id}
              className="flex h-5 items-center"
              onClick={handleClick}
            >
              {node.data.key}
            </button>
            {!isLast && (
              <svg
                width="7"
                height="10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-gray-300"
              >
                <path
                  d="M1.5 8.5 5 5 1.5 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </>
        );
      })}
    </div>
  );
}
