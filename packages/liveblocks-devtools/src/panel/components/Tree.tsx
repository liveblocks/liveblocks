import type { DevTools, Json } from "@liveblocks/core";
import cx from "classnames";
import type {
  ComponentProps,
  CSSProperties,
  MouseEvent,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";
import { forwardRef, Fragment, useCallback, useRef } from "react";
import type { NodeApi, NodeRendererProps, TreeApi } from "react-arborist";
import { Tree as ArboristTree } from "react-arborist";
import useResizeObserver from "use-resize-observer";

import { useDeepEffect } from "../../hooks/useDeepEffect";
import { mergeRefs } from "../../lib/mergeRefs";
import {
  ELLIPSIS,
  stringify,
  wrapObject,
  wrapProperty,
} from "../../lib/stringify";

const HIGHLIGHT_ANIMATION_DURATION = 600;
const HIGHLIGHT_ANIMATION_DELAY = 100;
const ROW_HEIGHT = 28;
const ROW_INDENT = 18;

const USE_GRID_LAYOUT = false;

const SPECIAL_HACK_PREFIX = "@@HACK@@ ^_^;";

function makeJsonNode(
  parentId: string,
  key: string,
  payload: Json
): DevTools.JsonTreeNode {
  return {
    type: "Json",
    id: `${parentId}:${key}`,
    key,
    payload,
  };
}

type ArboristTreeProps<T> = TreeApi<T>["props"];

type TreeProps<
  TTreeNode extends DevTools.UserTreeNode | DevTools.LsonTreeNode
> = Pick<ComponentProps<"div">, "className" | "style"> &
  ArboristTreeProps<TTreeNode> &
  RefAttributes<TreeApi<TTreeNode> | undefined>;

interface RowProps extends ComponentProps<"div"> {
  node: NodeApi;
}

interface RowHighlightProps extends ComponentProps<"div"> {
  node: NodeApi;
}

interface BreadcrumbsProps extends ComponentProps<"div"> {
  node: NodeApi<DevTools.LsonTreeNode>;
  onNodeClick: (node: NodeApi<DevTools.LsonTreeNode> | null) => void;
}

interface AutoSizerProps extends Omit<ComponentProps<"div">, "children"> {
  children: (dimensions: { width: number; height: number }) => ReactElement;
}

function color(node: DevTools.TreeNode): string {
  switch (node.type) {
    case "LiveObject":
      return "text-orange-500 dark:text-orange-400";

    case "LiveList":
      return "text-red-500 dark:text-red-400";

    case "LiveMap":
      return "text-blue-500 dark:text-blue-400";

    case "User":
      return "text-teal-500 dark:text-teal-500";

    case "Json":
      return "text-light-500 dark:text-dark-500";

    default:
      // e.g. future LiveXxx types
      return "text-light-500 dark:text-dark-500";
  }
}

function background(node: DevTools.TreeNode): string {
  switch (node.type) {
    case "LiveObject":
      return "tree-focus:bg-orange-500 dark:tree-focus:bg-orange-400";

    case "LiveList":
      return "tree-focus:bg-red-500 dark:tree-focus:bg-red-400";

    case "LiveMap":
      return "tree-focus:bg-blue-500 dark:tree-focus:bg-blue-400";

    case "User":
      return "tree-focus:bg-teal-500 dark:tree-focus:bg-teal-500";

    case "Json":
      return "tree-focus:bg-dark-800 dark:tree-focus:bg-dark-600";

    default:
      // e.g. future LiveXxx types
      return "tree-focus:bg-dark-800 dark:tree-focus:bg-dark-600";
  }
}

function icon(node: DevTools.TreeNode): ReactNode {
  switch (node.type) {
    case "LiveObject":
      return (
        <svg
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
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
      // e.g. future LiveXxx types
      // XXX Replace the SVG below with a "?" icon?
      return (
        <svg
          width="16"
          height="16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9Zm1 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM9 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

/**
 * Function that helps construct a "preview" string for a collapsed node.
 */
function summarize(node: DevTools.TreeNode): string {
  switch (node.type) {
    case "LiveObject":
      return wrapObject(
        node.payload
          .map((node) =>
            wrapProperty(
              node.key,
              node.type === "Json"
                ? stringify(node.payload)
                : wrapObject(ELLIPSIS)
            )
          )
          .join(", ")
      );

    case "LiveList":
      return `${node.payload.length} item${
        node.payload.length !== 1 ? "s" : ""
      }`;

    case "LiveMap":
      return `${node.payload.length} ${
        node.payload.length !== 1 ? "entries" : "entry"
      }`;

    case "User":
      return wrapObject(
        Object.entries(node.payload)
          .map(([key, value]) => wrapProperty(key, stringify(value)))
          .join(", ")
      );

    case "Json":
      return stringify(node.payload);

    default:
      // e.g. future LiveXxx types
      return "";
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

function hasSelectedParent<T>(node: NodeApi<T>): boolean {
  let current: NodeApi<T> | null = node.parent;

  while (current !== null) {
    if (current.isSelected) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function RowHighlight({ node, className, ...props }: RowHighlightProps) {
  const isInitial = useRef(true);
  const ref = useRef<HTMLDivElement>(null);

  useDeepEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;

      return;
    }

    ref.current?.animate([{ opacity: 1 }], {
      fill: "forwards",
    });
    ref.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: HIGHLIGHT_ANIMATION_DURATION,
      easing: "ease-out",
      fill: "forwards",
      delay: HIGHLIGHT_ANIMATION_DELAY,
    });
  }, [node.data]);

  return (
    <div
      ref={ref}
      className={cx(
        className,
        "pointer-events-none absolute inset-0 -z-10 opacity-0"
      )}
      {...props}
    />
  );
}

function Row({ node, children, className, ...props }: RowProps) {
  const isOpen = node.isOpen;
  const isParent = node.isInternal;
  const isSelected = node.isSelected;
  const isWithinSelectedParent = !isSelected && hasSelectedParent(node);
  const shouldShowUpdates = isParent ? !isOpen : true;

  return (
    <div
      className={cx(
        className,
        "text-dark-400 dark:text-light-400 flex h-full items-center gap-2 pr-2",
        isSelected
          ? [
              background(node.data),
              "tree-focus:text-light-0 bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200",
            ]
          : isWithinSelectedParent
          ? "hover:bg-light-100 dark:hover:bg-dark-100 tree-focus:bg-light-100 dark:tree-focus:bg-dark-100 hover:tree-focus:bg-light-200 dark:tree-focus:hover:bg-dark-200"
          : "hover:bg-light-100 dark:hover:bg-dark-100"
      )}
      {...props}
    >
      {shouldShowUpdates && (
        <RowHighlight
          node={node}
          className={
            isSelected
              ? "bg-white/20"
              : isWithinSelectedParent
              ? "bg-light-200 dark:bg-dark-200"
              : "bg-light-100 dark:bg-dark-100"
          }
        />
      )}
      <div className="ml-2 flex h-[8px] w-[8px] items-center justify-center">
        {isParent && (
          <svg
            width="8"
            height="8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cx(
              "opacity-60 transition-transform",
              isOpen && "rotate-90"
            )}
          >
            <path
              d="M2 6.117V1.883a.5.5 0 0 1 .757-.429l3.528 2.117a.5.5 0 0 1 0 .858L2.757 6.546A.5.5 0 0 1 2 6.116Z"
              fill="currentColor"
            />
          </svg>
        )}
      </div>
      <div
        className={cx(
          color(node.data),
          isSelected && "tree-focus:text-light-0"
        )}
      >
        {icon(node.data)}
      </div>
      <div
        className={cx(
          USE_GRID_LAYOUT
            ? [
                "grid min-w-0 flex-1 items-center gap-[inherit]",
                isOpen
                  ? "grid-cols-[1fr]"
                  : "grid-cols-[minmax(0,1fr)_calc(var(--width)_*_0.4)]",
              ]
            : "flex min-w-0 flex-1 items-center gap-[inherit]"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function RowName({ children, className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cx(className, "truncate font-mono text-[95%]")} {...props}>
      {children}
    </span>
  );
}

function RowInfo({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(className, "flex flex-none items-center gap-[inherit]")}
      {...props}
    >
      {children}
    </div>
  );
}

function RowPreview({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cx(className, "truncate font-mono opacity-60")} {...props}>
      {children}
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

function UserNodeRenderer({
  node,
  style,
}: NodeRendererProps<DevTools.UserTreeNode>) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) =>
      toggleNode(node, { siblings: event.altKey }),
    []
  );

  return (
    <Row node={node} style={style} onClick={handleClick}>
      <RowInfo>
        <RowName>{node.data.key}</RowName>
        <Badge className="flex-none opacity-60">#{node.data.id}</Badge>
        {node.data.payload.isReadOnly && (
          <Badge className="flex-none opacity-60">Read-only</Badge>
        )}
      </RowInfo>
      {!node.isOpen && <RowPreview>{summarize(node.data)}</RowPreview>}
    </Row>
  );
}

function LiveNodeRenderer({
  node,
  style,
}: NodeRendererProps<DevTools.LsonTreeNode>) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) =>
      toggleNode(node, { siblings: event.altKey }),
    []
  );

  return (
    <Row node={node} style={style} onClick={handleClick}>
      <RowInfo>
        <RowName>{node.data.key}</RowName>
        <Badge
          className={cx(
            "flex-none",
            node.isSelected && "tree-focus:text-current",
            color(node.data)
          )}
        >
          {node.data.type}
        </Badge>
      </RowInfo>
      {!node.isOpen && <RowPreview>{summarize(node.data)}</RowPreview>}
    </Row>
  );
}

function JsonNodeRenderer({
  node,
  style,
}: NodeRendererProps<DevTools.JsonTreeNode>) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) =>
      toggleNode(node, { siblings: event.altKey }),
    []
  );

  return (
    <Row node={node} style={style} onClick={handleClick}>
      <RowInfo>
        <RowName>{node.data.key}</RowName>
      </RowInfo>
      {!node.isOpen && <RowPreview>{summarize(node.data)}</RowPreview>}
    </Row>
  );
}

function LsonNodeRenderer(props: NodeRendererProps<DevTools.LsonTreeNode>) {
  switch (props.node.data.type) {
    case "LiveMap":
    case "LiveList":
    case "LiveObject":
      return (
        <LiveNodeRenderer
          {...(props as NodeRendererProps<DevTools.LsonTreeNode>)}
        />
      );

    case "Json":
      return (
        <JsonNodeRenderer
          {...(props as NodeRendererProps<DevTools.JsonTreeNode>)}
        />
      );

    default:
      // e.g. future LiveXxx types
      return (
        <LiveNodeRenderer
          {...(props as NodeRendererProps<DevTools.LsonTreeNode>)}
        />
      );
  }
}

function PresenceNodeRenderer(
  props: NodeRendererProps<DevTools.UserTreeNode | DevTools.JsonTreeNode>
) {
  switch (props.node.data.type) {
    case "User":
      return (
        <UserNodeRenderer
          {...(props as NodeRendererProps<DevTools.UserTreeNode>)}
        />
      );

    case "Json":
      return (
        <JsonNodeRenderer
          {...(props as NodeRendererProps<DevTools.JsonTreeNode>)}
        />
      );

    default:
      return null;
  }
}

function childrenAccessor(
  node: DevTools.UserTreeNode | DevTools.JsonTreeNode
): (DevTools.UserTreeNode | DevTools.JsonTreeNode)[] | null;
function childrenAccessor(
  node: DevTools.LsonTreeNode
): DevTools.LsonTreeNode[] | null;
function childrenAccessor(node: DevTools.TreeNode): DevTools.TreeNode[] | null {
  switch (node.type) {
    case "LiveList":
    case "LiveMap":
    case "LiveObject":
      return node.payload;

    case "User": {
      //
      // This harcodes which keys are displayed as top-level properties of User
      // nodes, most notably "presence" and "info". The special thing about
      // these properties is that we'll want to expand these "one level deep",
      // unlike other Json values we render elsewhere.
      //
      // This is currently implemented by pulling a hack, and we'll likely want
      // to implement this more robustly in a later version.
      //
      // The hack consists of three parts:
      // 1. When this accessor is called by Arborist to ask for the children of
      //    this node, we create some Json nodes on the fly, derived from
      //    actual User data.
      // 2. We "tag" these nodes as special by adding a special prefix to their
      //    internal node ID. (We cannot easily add a custom field, because the
      //    types are "owned" by our client package, and that package should
      //    not have any knowledge about UI details.)
      // 3. In the "Json" case below, we'll do the same: we dynamically
      //    generate child nodes for the subfields of "presence" and "info",
      //    effectively making those Json nodes expandable, but we immediately
      //    remove the special tag there, so that those subnodes themselves are
      //    "normal" unexpandable Json nodes again.
      //
      // NOTE: While this is currently a hack, we may decide to make this the
      // default behavior and always allow Json nodes to be expanded in the UI.
      // This is more of a product decision, though. But removing this hack
      // would make all Json nodes automatically expandable, which may be
      // a nice feature.
      //
      const USER_FIELDS = ["id", "info", "presence"] as const;

      return USER_FIELDS.flatMap((key) => {
        const payload = node.payload[key];
        return payload === undefined
          ? []
          : [makeJsonNode(`${SPECIAL_HACK_PREFIX}${node.id}`, key, payload)];
        //                   ^^^^^^^^^^^^^^^^^^^
        //                   Special tag that triggers special behavior (see
        //                   below in the "Json" case)
      });
    }

    case "Json":
      if (node.id.startsWith(SPECIAL_HACK_PREFIX)) {
        if (Array.isArray(node.payload)) {
          return node.payload.map((item, index) =>
            makeJsonNode(
              `${node.id.substring(SPECIAL_HACK_PREFIX.length)}`,
              //                   ^^^^^^^^^^^^^^^^^^^
              //                   Undo the "special behavior" for the subnodes,
              //                   making them "normal Json" nodes that aren't
              //                   expandable
              index.toString(),
              item
            )
          );
        } else if (node.payload !== null && typeof node.payload === "object") {
          return Object.entries(node.payload).flatMap(([key, value]) =>
            value === undefined
              ? []
              : [
                  makeJsonNode(
                    `${node.id.substring(SPECIAL_HACK_PREFIX.length)}`,
                    //                   ^^^^^^^^^^^^^^^^^^^
                    //                   Undo the "special behavior" for the
                    //                   subnodes, making them "normal Json" nodes
                    //                   that aren't expandable
                    key,
                    value
                  ),
                ]
          );
        }
      }

      // Common case: Json nodes don't have children and aren't expandable
      return null;

    default:
      // e.g. future LiveXxx types
      return null;
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
        style={
          {
            "--width": `${width}px`,
            "--height": `${height}px`,
            ...autoSizerStyle,
            ...style,
          } as CSSProperties
        }
        ref={mergeRefs(ref, forwardRef)}
        {...props}
      >
        {width && height ? children({ width, height }) : null}
      </div>
    );
  }
);

export const StorageTree = forwardRef<
  TreeApi<DevTools.LsonTreeNode>,
  TreeProps<DevTools.LsonTreeNode>
>(({ className, style, ...props }, ref) => {
  return (
    <AutoSizer className={cx(className, "tree")} style={style}>
      {({ width, height }) => (
        <ArboristTree
          ref={ref}
          width={width}
          height={height}
          childrenAccessor={childrenAccessor}
          disableDrag
          disableDrop
          disableMultiSelection
          className="!overflow-x-hidden"
          selectionFollowsFocus
          rowHeight={ROW_HEIGHT}
          indent={ROW_INDENT}
          {...props}
        >
          {LsonNodeRenderer}
        </ArboristTree>
      )}
    </AutoSizer>
  );
});

export const PresenceTree = forwardRef<
  TreeApi<DevTools.UserTreeNode | DevTools.JsonTreeNode>,
  TreeProps<DevTools.UserTreeNode | DevTools.JsonTreeNode>
>(({ className, style, ...props }, ref) => {
  return (
    <AutoSizer className={cx(className, "tree")} style={style}>
      {({ width, height }) => (
        <ArboristTree
          ref={ref}
          width={width}
          height={height}
          childrenAccessor={childrenAccessor}
          disableDrag
          disableDrop
          disableMultiSelection
          className="!overflow-x-hidden"
          selectionFollowsFocus
          rowHeight={ROW_HEIGHT}
          indent={ROW_INDENT}
          {...props}
        >
          {PresenceNodeRenderer}
        </ArboristTree>
      )}
    </AutoSizer>
  );
});

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
        "border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 scrollbar-hidden flex h-8 items-center gap-1.5 overflow-x-auto border-t px-2.5"
      )}
      {...props}
    >
      <span
        key={node.data.id}
        className="text-dark-600 dark:text-light-600 flex h-5 items-center font-mono text-[95%]"
      >
        $
      </span>
      {nodePath.map((node) => (
        <Fragment key={node.id}>
          <svg
            width="7"
            height="10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-none opacity-50"
          >
            <path
              d="M1.5 8.5 5 5 1.5 1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <button
            key={node.data.id}
            className=" hover:text-dark-0 focus-visible:text-dark-0 dark:hover:text-light-0 dark:focus-visible:text-light-0 text-dark-600 dark:text-light-600 flex h-5 items-center gap-1.5 font-mono text-[95%]"
            onClick={() => onNodeClick(node)}
          >
            <div className={color(node.data)}>{icon(node.data)}</div>
            <span>{node.data.key}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}
