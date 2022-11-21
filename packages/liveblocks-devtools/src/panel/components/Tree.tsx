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
  ReactNode,
  RefAttributes,
} from "react";
import { forwardRef, useCallback } from "react";
import type { NodeApi, NodeRendererProps, TreeApi } from "react-arborist";
import { Tree as ArboristTree } from "react-arborist";
import useResizeObserver from "use-resize-observer";

import { assertNever } from "../../lib/assert";
import { mergeRefs } from "../../lib/mergeRefs";
import { truncate } from "../../lib/truncate";

const ROW_HEIGHT = 28;
const ROW_INDENT = 18;

type ArboristTreeProps<T> = TreeApi<T>["props"];

type TreeProps = Pick<ComponentProps<"div">, "className" | "style"> &
  ArboristTreeProps<StorageTreeNode | UserTreeNode> &
  RefAttributes<TreeApi<StorageTreeNode | UserTreeNode> | undefined>;

interface RowProps extends ComponentProps<"div"> {
  node: NodeApi;
}

interface BreadcrumbsProps extends ComponentProps<"div"> {
  node: NodeApi<TreeNode>;
  onNodeClick: (node: NodeApi<TreeNode> | null) => void;
}

interface AutoSizerProps extends Omit<ComponentProps<"div">, "children"> {
  children: (dimensions: { width: number; height: number }) => ReactElement;
}

function color(node: StorageTreeNode | UserTreeNode): string {
  switch (node.type) {
    case "LiveObject":
      return "text-purple-500 dark:text-purple-400";

    case "LiveList":
      return "text-rose-500 dark:text-rose-400";

    case "LiveMap":
      return "text-blue-500 dark:text-blue-400";

    case "Json":
      return "text-light-500 dark:text-dark-500";

    case "User":
      return "text-amber-500 dark:text-amber-500";

    default:
      return assertNever(node, "Unhandled node type in icon()");
  }
}

function background(node: StorageTreeNode | UserTreeNode): string {
  switch (node.type) {
    case "LiveObject":
      return "bg-purple-500 dark:bg-purple-400";

    case "LiveList":
      return "bg-rose-500 dark:bg-rose-400";

    case "LiveMap":
      return "bg-blue-500 dark:bg-blue-400";

    case "Json":
      return "bg-light-500 dark:bg-dark-500";

    case "User":
      return "bg-amber-500 dark:bg-amber-500";

    default:
      return assertNever(node, "Unhandled node type in icon()");
  }
}

function icon(node: StorageTreeNode | UserTreeNode): ReactNode {
  switch (node.type) {
    case "LiveObject":
      return (
        <svg
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={color(node)}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4Zm9 0a.75.75 0 0 1 .75-.75c.57 0 1.132.2 1.559.58.43.382.691.92.691 1.503v1.334c0 .124.055.264.188.382.135.12.336.201.562.201a.75.75 0 0 1 0 1.5.851.851 0 0 0-.562.201.514.514 0 0 0-.188.382v1.334c0 .583-.261 1.121-.691 1.503a2.35 2.35 0 0 1-1.559.58.75.75 0 0 1 0-1.5c.226 0 .427-.08.562-.201a.514.514 0 0 0 .188-.382V9.333c0-.5.193-.969.52-1.333a1.993 1.993 0 0 1-.52-1.333V5.333a.515.515 0 0 0-.188-.382.851.851 0 0 0-.562-.201A.75.75 0 0 1 9 4Zm-2.75-.75a.75.75 0 0 1 0 1.5.851.851 0 0 0-.562.201.514.514 0 0 0-.188.382v1.334c0 .5-.193.969-.52 1.333.327.364.52.832.52 1.333v1.334c0 .124.055.264.188.382.135.12.336.201.562.201a.75.75 0 0 1 0 1.5c-.57 0-1.132-.2-1.559-.58A2.012 2.012 0 0 1 4 10.667V9.333a.514.514 0 0 0-.188-.382.851.851 0 0 0-.562-.201.75.75 0 0 1 0-1.5c.226 0 .427-.08.562-.201A.514.514 0 0 0 4 6.667V5.333c0-.583.261-1.121.691-1.503a2.35 2.35 0 0 1 1.559-.58Z"
            fill="currentColor"
          />
        </svg>
      );

    case "LiveList":
      return (
        <svg
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={color(node)}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9ZM9 4a.75.75 0 0 1 .75-.75h1c.69 0 1.25.56 1.25 1.25v7c0 .69-.56 1.25-1.25 1.25h-1a.75.75 0 0 1 0-1.5h.75v-6.5h-.75A.75.75 0 0 1 9 4Zm-2.75-.75a.75.75 0 1 1 0 1.5H5.5v6.5h.75a.75.75 0 0 1 0 1.5h-1c-.69 0-1.25-.56-1.25-1.25v-7c0-.69.56-1.25 1.25-1.25h1Z"
            fill="currentColor"
          />
        </svg>
      );

    case "LiveMap":
      return (
        <svg
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={color(node)}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9Zm9.126.084a.75.75 0 0 1 1.04-.208l.002.001.002.001.004.003.01.007a1.37 1.37 0 0 1 .102.078c.06.049.139.117.229.207.18.18.406.446.628.816C11.59 5.234 12 6.37 12 8c0 1.632-.41 2.766-.857 3.51-.222.37-.448.637-.628.817a2.965 2.965 0 0 1-.331.285l-.01.007-.004.002-.002.002h-.001l-.001.001a.75.75 0 0 1-.842-1.241l.019-.015c.021-.018.06-.05.111-.101.101-.102.25-.272.403-.528.303-.505.643-1.37.643-2.739 0-1.368-.34-2.234-.643-2.74a2.737 2.737 0 0 0-.403-.527 1.467 1.467 0 0 0-.13-.116.75.75 0 0 1-.198-1.033Zm-3.292-.208a.75.75 0 1 1 .823 1.256c-.021.017-.06.05-.111.101-.101.102-.25.272-.403.528C5.84 5.766 5.5 6.63 5.5 8c0 1.368.34 2.234.643 2.74.153.255.302.425.403.527.05.05.09.084.111.101l.019.015a.75.75 0 0 1-.842 1.241l-.002-.001-.002-.002-.004-.002-.01-.007a1.791 1.791 0 0 1-.102-.078 2.962 2.962 0 0 1-.229-.207 4.23 4.23 0 0 1-.628-.816C4.41 10.766 4 9.63 4 8c0-1.632.41-2.766.857-3.51a4.23 4.23 0 0 1 .628-.817 2.952 2.952 0 0 1 .331-.285l.01-.007.004-.003h.002l.001-.002h.001Z"
            fill="currentColor"
          />
        </svg>
      );

    case "Json":
      return (
        <svg
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={color(node)}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9Zm1 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM9 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            fill="currentColor"
          />
        </svg>
      );

    case "User":
      return (
        <svg
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={color(node)}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9Zm8 1A1.25 1.25 0 1 0 8 7a1.25 1.25 0 0 0 0-2.5ZM5.25 5.75a2.75 2.75 0 1 1 5.5 0 2.75 2.75 0 0 1-5.5 0ZM8 9.25c-1.38 0-2.431.296-3.224.761a4.172 4.172 0 0 0-1.587 1.634.75.75 0 0 0 1.321.71c.19-.353.502-.743 1.025-1.05.524-.307 1.303-.555 2.465-.555s1.941.248 2.465.555c.523.307.835.697 1.025 1.05a.75.75 0 0 0 1.32-.71 4.173 4.173 0 0 0-1.586-1.634C10.431 9.546 9.38 9.25 8 9.25Z"
            fill="currentColor"
          />
        </svg>
      );

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
      return `${node.items.length} item${node.items.length > 1 ? "s" : ""}`;

    case "LiveMap":
      return `${node.entries.length} ${
        node.entries.length > 1 ? "entries" : "entry"
      }`;

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

function hasFocusedParent<T>(node: NodeApi<T>): boolean {
  let curr: NodeApi<T> | null = node.parent;
  while (curr !== null) {
    if (curr.isFocused) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

function Row({ node, children, className, ...props }: RowProps) {
  const isFocused = node.isFocused;
  const isParentFocused = !node.isFocused && hasFocusedParent(node);

  return (
    <div
      className={cx(
        className,
        "text-dark-400 dark:text-light-400 flex h-full items-center gap-2 pr-2",
        isFocused
          ? "bg-light-200 dark:bg-dark-200 hover:bg-light-300 dark:hover:bg-dark-300"
          : isParentFocused
          ? "bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200"
          : "hover:bg-light-100 dark:hover:bg-dark-100"
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
            className={cx(
              "text-dark-900 dark:text-light-900 transition-transform",
              node.isOpen && "rotate-90"
            )}
          >
            <path
              d="M2 6.117V1.883a.5.5 0 0 1 .757-.429l3.528 2.117a.5.5 0 0 1 0 .858L2.757 6.546A.5.5 0 0 1 2 6.116Z"
              fill="currentColor"
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

function Badge({ children, className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cx(
        className,
        "text-2xs relative block whitespace-nowrap rounded-full px-2 py-1 font-medium before:absolute before:inset-0 before:rounded-[inherit] before:bg-current before:opacity-10 dark:before:opacity-[0.15]"
      )}
      {...props}
    >
      {children}
    </span>
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
        <Badge className="text-dark-800 dark:text-light-800">
          #{node.data.id}
        </Badge>
      ) : (
        <div className="text-dark-800 dark:text-light-800 truncate">
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
        <Badge className={color(node.data)}>{node.data.type}</Badge>
      ) : (
        <div className="text-dark-800 dark:text-light-800 truncate">
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
      <div className="text-dark-800 dark:text-light-800 truncate">{value}</div>
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

function childrenAccessor(node: TreeNode): TreeNode[] | null {
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
      return null;

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
      <AutoSizer className={className} style={style}>
        {({ width, height }) => (
          <ArboristTree
            ref={ref}
            width={width}
            height={height}
            childrenAccessor={childrenAccessor}
            disableDrag
            disableDrop
            className="!overflow-x-hidden"
            selectionFollowsFocus
            rowHeight={ROW_HEIGHT}
            indent={ROW_INDENT}
            {...props}
          >
            {TreeNodeRenderer}
          </ArboristTree>
        )}
      </AutoSizer>
    );
  }
);

/**
 * Returns the list of nodes, from the root (excluded) all the way down to the
 * current node (included). The current node will always be last in this list.
 *
 * The root node itself is excluded because it's an internal Arborist node
 * (invisible in the tree view).
 */
function getNodePath<T>(node: NodeApi<T>): NodeApi<T>[] {
  if (node.parent === null) {
    return [];
  } else {
    const path = getNodePath(node.parent);
    path.push(node);
    return path;
  }
}

export function Breadcrumbs({
  node,
  onNodeClick,
  className,
  ...props
}: BreadcrumbsProps) {
  const nodePath = getNodePath(node);
  return (
    <div
      className={cx(
        className,
        "border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 flex h-8 items-center gap-1.5 overflow-x-auto border-t px-2.5"
      )}
      {...props}
    >
      <button
        key={node.data.id}
        className="text-dark-600 hover:text-dark-0 focus-visible:text-dark-0 dark:text-light-600 dark:hover:text-light-0 dark:focus-visible:text-light-0 flex h-5 items-center"
        onClick={() => onNodeClick(null)}
      >
        $
      </button>
      {nodePath.map((node, index) => {
        const isTrailingNode = index === nodePath.length - 1;

        return (
          <>
            <svg
              width="7"
              height="10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-50"
            >
              <path
                d="M1.5 8.5 5 5 1.5 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <button
              key={node.data.id}
              className={cx(
                " hover:text-dark-0 focus-visible:text-dark-0 dark:hover:text-light-0 dark:focus-visible:text-light-0 flex h-5 items-center",
                isTrailingNode
                  ? "text-dark-0 dark:text-light-0"
                  : "text-dark-600 dark:text-light-600"
              )}
              onClick={() => onNodeClick(node)}
            >
              {node.data.key}
            </button>
          </>
        );
      })}
    </div>
  );
}
