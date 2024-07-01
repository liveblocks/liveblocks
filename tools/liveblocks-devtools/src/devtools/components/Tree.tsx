import type { DevTools, Json } from "@liveblocks/core";
import * as RadixDialog from "@radix-ui/react-dialog";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import cx from "classnames";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  CSSProperties,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import {
  createContext,
  forwardRef,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NodeApi, NodeRendererProps, TreeApi } from "react-arborist";
import { Tree as ArboristTree } from "react-arborist";
import useResizeObserver from "use-resize-observer";
import {
  ContentDeleted,
  ContentFormat,
  ContentJSON,
  ContentString,
  GC,
  Item,
} from "yjs";
import type { DeleteSet } from "yjs/dist/src/internals";

import { useDeepEffect } from "../../hooks/useDeepEffect";
import { assertNever } from "../../lib/assert";
import { mergeRefs } from "../../lib/mergeRefs";
import {
  ELLIPSIS,
  stringify,
  wrapObject,
  wrapProperty,
} from "../../lib/stringify";
import { truncate } from "../../lib/truncate";
import type { YUpdate } from "../contexts/CurrentRoom";
import { EyeIcon } from "../icons/actions";
import {
  ArrayIcon,
  BooleanOffIcon,
  BooleanOnIcon,
  CrossIcon,
  CustomEventIcon,
  EllipsisIcon,
  MapIcon,
  NumberIcon,
  ObjectIcon,
  QuestionIcon,
  StringIcon,
  TextIcon,
  TrashIcon,
  UserIcon,
} from "../icons/tree";
import type {
  YAbstractTypeTreeNode,
  YContentTreeNode,
  YDocTreeNode,
  YTopAbstractTypeTreeNode,
  YTreeNode,
} from "../tabs/yjs/to-yjs-tree-node";
import { Code } from "./Code";
import { Dialog } from "./Dialog";
import { Tooltip } from "./Tooltip";

/**
 * Node types that can be used in the Storage tree view.
 */
type StorageTreeNode = DevTools.LsonTreeNode;

/**
 * Node types that can be used in the Presence tree view.
 */
type PresenceTreeNode = DevTools.UserTreeNode | DevTools.JsonTreeNode;

/**
 * Node types that can be used in the Yjs logs tree view.
 */
type YLogsTreeNode =
  | YUpdateTreeNode
  | YUpdateStructTreeNode
  | YUpdateDeleteSetTreeNode;

type YUpdateTreeNode = {
  readonly type: "YUpdate";
  readonly id: string;
  readonly key: string;
  readonly payload: (YUpdateStructTreeNode | YUpdateDeleteSetTreeNode)[];
};

type YUpdateStructTreeNode = {
  readonly type: "YUpdateStruct";
  readonly id: string;
  readonly key: string;
  readonly payload: YUpdate["structs"][number];
};

type YUpdateDeleteSetTreeNode = {
  readonly type: "YUpdateDeleteSet";
  readonly id: string;
  readonly key: string;
  readonly payload: DeleteSet;
};

const HIGHLIGHT_ANIMATION_DURATION = 600;
const HIGHLIGHT_ANIMATION_DELAY = 100;
const ROW_HEIGHT = 28;
const ROW_INDENT = 18;

const USE_GRID_LAYOUT = false;
const SHOW_INTERNAL_ID = false;

export const SPECIAL_HACK_PREFIX = "@@HACK@@ ^_^;";

/**
 * Used to convert a list of updates to tree nodes.
 */
export function createTreeFromYUpdates(updates: YUpdate[]): YUpdateTreeNode[] {
  return updates.map((update, updateIndex) => {
    const payload = [];

    if (update.ds.clients.size > 0) {
      payload.push({
        type: "YUpdateDeleteSet",
        id: `YUpdateDeleteSet:${updateIndex}`,
        key: `${updateIndex}`,
        payload: update.ds,
      });
    }

    payload.push(
      ...update.structs.map((item, itemIndex) => {
        return {
          type: "YUpdateStruct",
          id: `YUpdateStruct:${updateIndex}:${itemIndex}`,
          key: `${updateIndex}:${itemIndex}`,
          payload: item,
        };
      })
    );

    return {
      type: "YUpdate",
      id: `YUpdate:${updateIndex}`,
      key: `${updateIndex}`,
      payload,
    };
  });
}

function getYUpdateStructType(struct: YUpdate["structs"][number]) {
  if (struct instanceof GC) {
    return "gc";
  } else if (struct instanceof Item) {
    return "item";
  } else {
    return "skip";
  }
}

/**
 * Used to generate new Json subnodes on the fly.
 */
export function makeJsonNode(
  parentId: string,
  key: string,
  payload: Json
): DevTools.JsonTreeNode {
  return { type: "Json", id: `${parentId}:${key}`, key, payload };
}

type ArboristTreeProps<T> = TreeApi<T>["props"];

type TreeProps<TTreeNode extends DevTools.TreeNode | YLogsTreeNode> = Pick<
  ComponentPropsWithoutRef<"div">,
  "className" | "style"
> &
  ArboristTreeProps<TTreeNode>;

interface RowProps<TTreeNode extends DevTools.TreeNode>
  extends ComponentProps<"div"> {
  node: NodeApi<TTreeNode>;
}

interface YLogsRowProps<TTreeNode extends YLogsTreeNode>
  extends ComponentProps<"div"> {
  node: NodeApi<TTreeNode>;
}

interface RowHighlightProps extends ComponentProps<"div"> {
  node: NodeApi;
}

interface RowLabelProps extends Omit<ComponentProps<"span">, "children"> {
  children: string;
}

interface JsonValueDialogProps extends ComponentProps<"div"> {
  node: NodeApi<DevTools.JsonTreeNode>;
}

interface BreadcrumbsProps extends ComponentProps<"div"> {
  node: NodeApi<StorageTreeNode>;
  onNodeClick: (node: NodeApi<StorageTreeNode> | null) => void;
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

    case "CustomEvent":
      return "text-blue-500 dark:text-blue-400";

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
      return <ObjectIcon />;

    case "LiveList":
      return <ArrayIcon />;

    case "LiveMap":
      return <MapIcon />;

    case "Json":
      if (Array.isArray(node.payload)) {
        return <ArrayIcon />;
      } else if (node.payload !== null && typeof node.payload === "object") {
        return <ObjectIcon />;
      } else if (typeof node.payload === "number") {
        return <NumberIcon />;
      } else if (typeof node.payload === "string") {
        return <StringIcon />;
      } else if (typeof node.payload === "boolean") {
        return node.payload ? <BooleanOnIcon /> : <BooleanOffIcon />;
      } else {
        return <EllipsisIcon />;
      }

    case "User":
      return <UserIcon />;

    case "CustomEvent":
      return <CustomEventIcon />;

    default:
      // e.g. future LiveXxx types
      return <QuestionIcon />;
  }
}

export function getYTreeNodeIcon(node: YTreeNode) {
  switch (node.type) {
    case "Y.Doc":
      return <ObjectIcon />;

    case "Y.AbstractType":
      return <ArrayIcon />;

    case "Y.Map":
      return <MapIcon />;

    case "Y.Array":
      return <ArrayIcon />;

    case "Y.Text":
    case "Y.XmlText":
    case "Y.XmlElement":
    case "Y.XmlFragment":
      return <TextIcon />;

    case "Y.ContentAny":
      if (node.payload.length === 1) {
        return <StringIcon />;
      }
      return <ArrayIcon />;
    case "Y.ContentBinary":
      return <ArrayIcon />;
    case "Y.ContentEmbed":
    case "Y.ContentFormat":
      return <ObjectIcon />;
    case "Y.ContentString":
      return <StringIcon />;
    default:
      return <EllipsisIcon />;
  }
}

function yLogsColor(node: YLogsTreeNode): string {
  switch (node.type) {
    case "YUpdateStruct":
      switch (getYUpdateStructType(node.payload)) {
        case "skip":
          return "text-light-500 dark:text-dark-500";

        case "gc":
          return "text-orange-500 dark:text-orange-400";

        case "item":
          return "text-blue-500 dark:text-blue-400";

        default:
          // e.g. possible other types
          return "text-light-500 dark:text-dark-500";
      }
    case "YUpdateDeleteSet":
      return "text-red-500 dark:text-red-400";
    default:
      return "text-light-500 dark:text-dark-500";
  }
}

export function getYTreeNodeColor(node: YTreeNode): string | undefined {
  switch (node.type) {
    case "Y.AbstractType":
      return "text-brand-500 dark:text-brand-400";
    case "Y.Map":
      return "text-red-500 dark:text-red-400";
    case "Y.Array":
      return "text-green-500 dark:text-green-500";
    case "Y.Text":
    case "Y.XmlText":
    case "Y.XmlElement":
    case "Y.XmlFragment":
      return "text-blue-500 dark:text-blue-400";

    case "Y.Doc":
    case "Y.ContentAny":
    case "Y.ContentBinary":
    case "Y.ContentEmbed":
    case "Y.ContentFormat":
    case "Y.ContentString":
      return "text-dark-500 dark:text-light-500";
  }
}

function yLogsBackground(node: YLogsTreeNode): string {
  switch (node.type) {
    case "YUpdateStruct":
      switch (getYUpdateStructType(node.payload)) {
        case "skip":
          return "tree-focus:bg-dark-800 dark:tree-focus:bg-dark-600";

        case "gc":
          return "tree-focus:bg-orange-500 dark:tree-focus:bg-orange-400";

        case "item":
          return "tree-focus:bg-blue-500 dark:tree-focus:bg-blue-400";

        default:
          // e.g. possible other types
          return "tree-focus:bg-dark-800 dark:tree-focus:bg-dark-600";
      }
    case "YUpdateDeleteSet":
      return "tree-focus:bg-red-500 dark:tree-focus:bg-red-400";
    default:
      return "tree-focus:bg-dark-800 dark:tree-focus:bg-dark-600";
  }
}

function yLogsIcon(node: YLogsTreeNode): ReactNode {
  switch (node.type) {
    case "YUpdate":
      return <EllipsisIcon />;

    case "YUpdateDeleteSet":
      return <CrossIcon />;

    case "YUpdateStruct":
      switch (getYUpdateStructType(node.payload)) {
        case "skip":
          return <EllipsisIcon />;

        case "gc":
          return <TrashIcon />;

        case "item": {
          const item = node.payload as Item;

          if (item.content instanceof ContentString) {
            return <StringIcon />;
          }
          if (item.content instanceof ContentDeleted) {
            return <CrossIcon />;
          }
          if (item.content instanceof ContentJSON) {
            return <ObjectIcon />;
          }

          // Any other content type
          return <EllipsisIcon />;
        }

        default:
          // e.g. possible other types
          return <QuestionIcon />;
      }

    default:
      // e.g. possible other types
      return <QuestionIcon />;
  }
}

function getYTreeNodeBackground(node: YTreeNode): string {
  switch (node.type) {
    case "Y.AbstractType":
      return "tree-focus:bg-brand-500 dark:tree-focus:bg-brand-400";
    case "Y.Map":
      return "tree-focus:bg-red-500 dark:tree-focus:bg-red-400";
    case "Y.Array":
      return "tree-focus:bg-green-500 dark:tree-focus:bg-green-500";
    case "Y.Text":
    case "Y.XmlText":
    case "Y.XmlElement":
    case "Y.XmlFragment":
      return "tree-focus:bg-blue-500 dark:tree-focus:bg-blue-400";
    case "Y.Doc":
    case "Y.ContentAny":
    case "Y.ContentBinary":
    case "Y.ContentEmbed":
    case "Y.ContentFormat":
    case "Y.ContentString":
      return "tree-focus:bg-dark-800 dark:tree-focus:bg-dark-600";
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
      return `${node.payload.length} item${node.payload.length !== 1 ? "s" : ""
        }`;

    case "LiveMap":
      return `${node.payload.length} ${node.payload.length !== 1 ? "entries" : "entry"
        }`;

    case "User":
      return wrapObject(
        Object.entries(node.payload)
          .map(([key, value]) => wrapProperty(key, stringify(value)))
          .join(", ")
      );

    case "CustomEvent":
    case "Json":
      return stringify(node.payload);

    default:
      // e.g. future LiveXxx types
      return "";
  }
}

function summarizeYTreeNode(node: YTreeNode): ReactNode {
  switch (node.type) {
    case "Y.ContentString":
      return node.payload;
    case "Y.ContentAny":
      if (node.payload.length === 0) {
        return "Empty";
      } else if (node.payload.length === 1) {
        return stringify(node.payload[0]);
      } else {
        return `${node.payload.length} items: ${stringify(node.payload)}`;
      }
    case "Y.Doc":
    case "Y.Map":
      return `${node.payload.length} ${
        node.payload.length !== 1 ? "entries" : "entry"
      }`;
    case "Y.Array":
      return `${node.payload.length} item${
        node.payload.length !== 1 ? "s" : ""
      }`;
    case "Y.AbstractType":
    case "Y.Text":
    case "Y.XmlText":
    case "Y.XmlElement":
    case "Y.XmlFragment":
      return toString(node);
    case "Y.ContentFormat":
    case "Y.ContentEmbed":
      return stringify(node.payload);
    case "Y.ContentBinary":
      return `${node.payload.length} item${
        node.payload.length !== 1 ? "s" : ""
      }`;
    default:
      return "";
  }
}

function toString(node: YTreeNode): string {
  switch (node.type) {
    case "Y.ContentString":
      return node.payload;
    case "Y.ContentAny":
    case "Y.ContentBinary":
    case "Y.ContentEmbed":
    case "Y.ContentFormat":
      return "";
    case "Y.Doc":
    case "Y.AbstractType":
    case "Y.Array":
    case "Y.Map":
    case "Y.Text":
    case "Y.XmlText":
    case "Y.XmlElement":
    case "Y.XmlFragment":
      return (
        node.payload as (
          | YTopAbstractTypeTreeNode
          | YDocTreeNode
          | YAbstractTypeTreeNode
          | YContentTreeNode
        )[]
      ).reduce((str, node) => str + toString(node), "");
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

function useToggleNode<T>(node: NodeApi<T>) {
  return useCallback(
    (event: MouseEvent<HTMLDivElement>) =>
      toggleNode(node, { siblings: event.altKey }),
    [node]
  );
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

function Row<TTreeNode extends DevTools.TreeNode>({
  node,
  children,
  className,
  ...props
}: RowProps<TTreeNode>) {
  const isOpen = node.isOpen;
  const isParent = node.isInternal;
  const isSelected = node.isSelected;
  const isWithinSelectedParent = !isSelected && hasSelectedParent(node);
  const shouldShowUpdates = isParent ? !isOpen : true;

  return (
    <div
      className={cx(
        className,
        "row text-dark-400 dark:text-light-400 group flex h-full items-center gap-2 pr-2",
        isSelected
          ? [
            background(node.data),
            "tree-focus:text-light-0 bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200",
          ]
          : isWithinSelectedParent
            ? "hover:bg-light-100 dark:hover:bg-dark-100 tree-focus:bg-light-100 dark:tree-focus:bg-dark-100 hover:tree-focus:bg-light-200 dark:tree-focus:hover:bg-dark-200"
            : "hover:bg-light-100 dark:hover:bg-dark-100"
      )}
      data-selected={isSelected || undefined}
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
          <CaretRightIcon
            className={cx(
              "opacity-60 transition-transform",
              isOpen && "rotate-90"
            )}
          />
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

function YLogsRow<TTreeNode extends YLogsTreeNode>({
  node,
  children,
  className,
  ...props
}: YLogsRowProps<TTreeNode>) {
  const isOpen = node.isOpen;
  const isParent = node.isInternal;
  const isSelected = node.isSelected;
  const isWithinSelectedParent = !isSelected && hasSelectedParent(node);

  return (
    <div
      className={cx(
        className,
        "row text-dark-400 dark:text-light-400 group flex h-full items-center gap-2 pr-2",
        isSelected
          ? [
            yLogsBackground(node.data),
            "tree-focus:text-light-0 bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200",
          ]
          : isWithinSelectedParent
            ? "hover:bg-light-100 dark:hover:bg-dark-100 tree-focus:bg-light-100 dark:tree-focus:bg-dark-100 hover:tree-focus:bg-light-200 dark:tree-focus:hover:bg-dark-200"
            : "hover:bg-light-100 dark:hover:bg-dark-100"
      )}
      data-selected={isSelected || undefined}
      {...props}
    >
      <div className="ml-2 flex h-[8px] w-[8px] items-center justify-center">
        {isParent && (
          <CaretRightIcon
            className={cx(
              "opacity-60 transition-transform",
              isOpen && "rotate-90"
            )}
          />
        )}
      </div>
      <div
        className={cx(
          yLogsColor(node.data),
          isSelected && "tree-focus:text-light-0"
        )}
      >
        {yLogsIcon(node.data)}
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

function YTypeRow({
  node,
  children,
  className,
  ...props
}: ComponentProps<"div"> & { node: NodeApi<YTreeNode> }) {
  const isOpen = node.isOpen;
  const isParent = node.isInternal;
  const isSelected = node.isSelected;
  const isWithinSelectedParent = !isSelected && hasSelectedParent(node);
  const shouldShowUpdates = isParent ? !isOpen : true;

  return (
    <div
      className={cx(
        className,
        "row text-dark-400 dark:text-light-400 group flex h-full items-center gap-2 pr-2",
        isSelected
          ? [
              getYTreeNodeBackground(node.data),
              "tree-focus:text-light-0 bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200",
            ]
          : isWithinSelectedParent
            ? "hover:bg-light-100 dark:hover:bg-dark-100 tree-focus:bg-light-100 dark:tree-focus:bg-dark-100 hover:tree-focus:bg-light-200 dark:tree-focus:hover:bg-dark-200"
            : "hover:bg-light-100 dark:hover:bg-dark-100"
      )}
      data-selected={isSelected || undefined}
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
          <CaretRightIcon
            className={cx(
              "opacity-60 transition-transform",
              isOpen && "rotate-90"
            )}
          />
        )}
      </div>
      <div
        className={cx(
          getYTreeNodeColor(node.data),
          isSelected && "tree-focus:text-light-0"
        )}
      >
        {getYTreeNodeIcon(node.data)}
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

function RowLabel({ children: label, className, ...props }: RowLabelProps) {
  const search = useContext(TreeSearchContext);
  const highlightedLabel = useMemo(() => {
    if (!search) {
      return label;
    }

    const match = search.exec(label);
    if (!match) {
      return label;
    }

    const beforeText = label.slice(0, match.index);
    const matchText = label.slice(match.index, match.index + match[0].length);
    const afterText = label.slice(match.index + match[0].length);

    return (
      <>
        {beforeText && <span className="opacity-50">{beforeText}</span>}
        <strong className="font-semibold">{matchText}</strong>
        {afterText && <span className="opacity-50">{afterText}</span>}
      </>
    );
  }, [label, search]);

  return (
    <span className={cx(className, "truncate font-mono text-[95%]")} {...props}>
      {highlightedLabel}
    </span>
  );
}

function RowStaticLabel({
  children,
  className,
  ...props
}: ComponentProps<"span">) {
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
  const toggle = useToggleNode(node);
  return (
    <Row node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowLabel>{node.data.key}</RowLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
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
  const toggle = useToggleNode(node);
  return (
    <Row node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowLabel>{node.data.key}</RowLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
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

function LsonNodeRenderer(props: NodeRendererProps<DevTools.LsonTreeNode>) {
  switch (props.node.data.type) {
    case "LiveMap":
    case "LiveList":
    case "LiveObject":
      return <LiveNodeRenderer {...props} />;

    case "Json":
      return (
        <JsonNodeRenderer
          {...(props as NodeRendererProps<DevTools.JsonTreeNode>)}
        />
      );

    default:
      // e.g. future LiveXxx types
      return <LiveNodeRenderer {...props} />;
  }
}

function YUpdateNodeRenderer({
  node,
  style,
}: NodeRendererProps<YUpdateTreeNode>) {
  const toggle = useToggleNode(node);
  return (
    <YLogsRow node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowStaticLabel>
          {node.data.payload.length} change
          {node.data.payload.length === 1 ? "" : "s"}
        </RowStaticLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
      </RowInfo>
    </YLogsRow>
  );
}

function YUpdateStructNodeRenderer({
  node,
  style,
}: NodeRendererProps<YUpdateStructTreeNode>) {
  const toggle = useToggleNode(node);
  const content = useMemo(() => {
    switch (getYUpdateStructType(node.data.payload)) {
      case "skip":
        return <RowStaticLabel>Skip</RowStaticLabel>;
      case "gc":
        return <RowStaticLabel>Garbage collection</RowStaticLabel>;
      case "item": {
        const item = node.data.payload as Item;

        if (item.content instanceof ContentString) {
          return (
            <>
              <RowStaticLabel>ContentString</RowStaticLabel>
              <RowPreview>{truncate(item.content.str)}</RowPreview>
            </>
          );
        }
        if (item.content instanceof ContentDeleted) {
          return (
            <>
              <RowStaticLabel>ContentDeleted</RowStaticLabel>
              <RowPreview>
                {item.length} deletion{item.length === 1 ? "" : "s"}
              </RowPreview>
            </>
          );
        }
        if (item.content instanceof ContentFormat) {
          return (
            <>
              <RowStaticLabel>ContentFormat</RowStaticLabel>
              <RowPreview>
                {truncate(item.content.value?.toString())}
              </RowPreview>
            </>
          );
        }
        if (item.content instanceof ContentJSON) {
          return (
            <>
              <RowStaticLabel>ContentFormat</RowStaticLabel>
              <RowPreview>{truncate(item.content.arr?.toString())}</RowPreview>
            </>
          );
        }

        // Fallback to just showing the type
        return <RowStaticLabel>{item.content.constructor.name}</RowStaticLabel>;
      }
    }
  }, [node]);

  return (
    <YLogsRow node={node} style={style} onClick={toggle}>
      <RowInfo>
        {content}
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
      </RowInfo>
    </YLogsRow>
  );
}

function YUpdateDeleteSetNodeRenderer({
  node,
  style,
}: NodeRendererProps<YUpdateDeleteSetTreeNode>) {
  const toggle = useToggleNode(node);
  return (
    <YLogsRow node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowStaticLabel>DeleteSet</RowStaticLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
      </RowInfo>
    </YLogsRow>
  );
}

function JsonValueDialog({ node }: JsonValueDialogProps) {
  return (
    <div className="grid h-[calc(100vh-2*theme(spacing.8))] max-h-[480px] grid-cols-[1fr] grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-light-300 dark:border-dark-300 flex h-9 items-center justify-between border-b px-2.5">
        <div className="child:select-none flex min-w-0 select-none items-center">
          <div className={cx(color(node.data), "mr-2 flex-none")}>
            {icon(node.data)}
          </div>
          <span className="text-dark-600 dark:text-light-600 truncate font-mono text-[95%]">
            {node.data.key}
          </span>
        </div>
        <RadixDialog.Close
          aria-label="Close"
          className="text-dark-600 hover:text-dark-0 focus-visible:text-dark-0 dark:text-light-600 dark:hover:text-light-0 dark:focus-visible:text-light-0 flex h-5 w-5 items-center justify-center"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            role="presentation"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.03 5.03a.75.75 0 0 0-1.06-1.06L8 6.94 5.03 3.97a.75.75 0 0 0-1.06 1.06L6.94 8l-2.97 2.97a.75.75 0 1 0 1.06 1.06L8 9.06l2.97 2.97a.75.75 0 1 0 1.06-1.06L9.06 8l2.97-2.97Z"
              fill="currentColor"
            />
          </svg>
        </RadixDialog.Close>
      </div>
      <Code code={JSON.stringify(node.data.payload, null, 2)} language="json" />
    </div>
  );
}

function JsonNodeRenderer({
  node,
  style,
}: NodeRendererProps<DevTools.JsonTreeNode>) {
  const [isValueDialogOpen, setValueDialogOpen] = useState(false);
  const isActionable = node.isSelected && !node.isOpen;
  const toggle = useToggleNode(node);
  const handleValueDialogOpen = useCallback(
    (event: MouseEvent | KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setValueDialogOpen(true);
    },
    []
  );

  useEffect(() => {
    if (!isActionable) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        handleValueDialogOpen(event);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionable, handleValueDialogOpen]);

  return (
    <Row node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowLabel>{node.data.key}</RowLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
      </RowInfo>
      {!node.isOpen && (
        <>
          <RowPreview>{summarize(node.data)}</RowPreview>
          <div className="ml-auto flex-none">
            <Dialog
              content={
                isValueDialogOpen ? <JsonValueDialog node={node} /> : null
              }
              open={isValueDialogOpen}
              onOpenChange={setValueDialogOpen}
            >
              <Tooltip content="Show value" sideOffset={8}>
                <button
                  onClick={handleValueDialogOpen}
                  aria-label="Show value"
                  className="text-light-500 dark:text-dark-500 hover:text-light-700 dark:hover:text-dark-700 tree-focus:group-[[data-selected]]:text-light-0/60 tree-focus:group-[[data-selected]]:hover:text-light-0/80 hidden h-full items-center justify-center group-hover:flex group-focus:flex group-[[data-selected]]:flex"
                >
                  <EyeIcon />
                </button>
              </Tooltip>
            </Dialog>
          </div>
        </>
      )}
    </Row>
  );
}

function PresenceNodeRenderer(props: NodeRendererProps<PresenceTreeNode>) {
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

function YContentValueDialog({ node }: { node: NodeApi<YContentTreeNode> }) {
  return (
    <div className="grid h-[calc(100vh-2*theme(spacing.8))] max-h-[480px] grid-cols-[1fr] grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-light-300 dark:border-dark-300 flex h-9 items-center justify-between border-b px-2.5">
        <div className="child:select-none flex min-w-0 select-none items-center">
          <div className={cx(getYTreeNodeColor(node.data), "mr-2 flex-none")}>
            {getYTreeNodeIcon(node.data)}
          </div>
          <span className="text-dark-600 dark:text-light-600 truncate font-mono text-[95%]">
            {node.data.key}
          </span>
        </div>
        <RadixDialog.Close
          aria-label="Close"
          className="text-dark-600 hover:text-dark-0 focus-visible:text-dark-0 dark:text-light-600 dark:hover:text-light-0 dark:focus-visible:text-light-0 flex h-5 w-5 items-center justify-center"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            role="presentation"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.03 5.03a.75.75 0 0 0-1.06-1.06L8 6.94 5.03 3.97a.75.75 0 0 0-1.06 1.06L6.94 8l-2.97 2.97a.75.75 0 1 0 1.06 1.06L8 9.06l2.97 2.97a.75.75 0 1 0 1.06-1.06L9.06 8l2.97-2.97Z"
              fill="currentColor"
            />
          </svg>
        </RadixDialog.Close>
      </div>
      <Code code={JSON.stringify(node.data.payload, null, 2)} language="json" />
    </div>
  );
}

function YAbstractTypeNodeRenderer({
  node,
  style,
}: NodeRendererProps<
  YAbstractTypeTreeNode | YDocTreeNode | YTopAbstractTypeTreeNode
>) {
  const toggle = useToggleNode(node);

  return (
    <YTypeRow node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowLabel>{node.data.key}</RowLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
      </RowInfo>
      {node.data.type !== "Y.AbstractType" && (
        <Badge
          className={cx(
            "flex-none",
            node.isSelected && "tree-focus:text-current",
            getYTreeNodeColor(node.data)
          )}
        >
          {node.data.type}
        </Badge>
      )}

      {!node.isOpen && <RowPreview>{summarizeYTreeNode(node.data)}</RowPreview>}
    </YTypeRow>
  );
}

function YContentTypeNodeRenderer({
  node,
  style,
}: NodeRendererProps<YContentTreeNode>) {
  const [isValueDialogOpen, setValueDialogOpen] = useState(false);
  const isActionable = node.isSelected && !node.isOpen;
  const toggle = useToggleNode(node);
  const handleValueDialogOpen = useCallback(
    (event: MouseEvent | KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setValueDialogOpen(true);
    },
    []
  );

  useEffect(() => {
    if (!isActionable) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        handleValueDialogOpen(event);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionable, handleValueDialogOpen]);

  return (
    <YTypeRow node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowLabel>{node.data.key}</RowLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
      </RowInfo>
      <Badge
        className={cx(
          "flex-none",
          node.isSelected && "tree-focus:text-current",
          getYTreeNodeColor(node.data)
        )}
      >
        {node.data.type}
      </Badge>

      {!node.isOpen && (
        <>
          <RowPreview>{summarizeYTreeNode(node.data)}</RowPreview>
          <div className="ml-auto flex-none">
            <Dialog
              content={
                isValueDialogOpen ? <YContentValueDialog node={node} /> : null
              }
              open={isValueDialogOpen}
              onOpenChange={setValueDialogOpen}
            >
              <Tooltip content="Show value" sideOffset={8}>
                <button
                  onClick={handleValueDialogOpen}
                  aria-label="Show value"
                  className="text-light-500 dark:text-dark-500 hover:text-light-700 dark:hover:text-dark-700 tree-focus:group-[[data-selected]]:text-light-0/60 tree-focus:group-[[data-selected]]:hover:text-light-0/80 hidden h-full items-center justify-center group-hover:flex group-focus:flex group-[[data-selected]]:flex"
                >
                  <EyeIcon />
                </button>
              </Tooltip>
            </Dialog>
          </div>
        </>
      )}
    </YTypeRow>
  );
}

function YNodeRenderer(props: NodeRendererProps<YTreeNode>) {
  switch (props.node.data.type) {
    case "Y.Doc":
    case "Y.AbstractType":
    case "Y.Map":
    case "Y.Array":
    case "Y.Text":
    case "Y.XmlText":
    case "Y.XmlElement":
    case "Y.XmlFragment":
      return (
        <YAbstractTypeNodeRenderer
          {...(props as NodeRendererProps<YAbstractTypeTreeNode>)}
        />
      );
    case "Y.ContentAny":
    case "Y.ContentBinary":
    case "Y.ContentEmbed":
    case "Y.ContentFormat":
    case "Y.ContentString":
      return (
        <YContentTypeNodeRenderer
          {...(props as NodeRendererProps<YContentTreeNode>)}
        />
      );
  }
}

function CustomEventNodeRenderer({
  node,
  style,
}: NodeRendererProps<DevTools.CustomEventTreeNode>) {
  const toggle = useToggleNode(node);
  return (
    <Row node={node} style={style} onClick={toggle}>
      <RowInfo>
        <RowLabel>{node.data.key}</RowLabel>
        {SHOW_INTERNAL_ID && <RowStaticLabel>{node.id}</RowStaticLabel>}
        {!node.isOpen ? (
          <RowPreview>{summarize(node.data)}</RowPreview>
        ) : node.data.connectionId < 0 ? (
          <Badge className="flex-none opacity-60">server</Badge>
        ) : (
          <Badge className="flex-none opacity-60">
            client #{node.data.connectionId}
          </Badge>
        )}
      </RowInfo>
    </Row>
  );
}

function YLogsNodeRenderer(props: NodeRendererProps<YLogsTreeNode>) {
  switch (props.node.data.type) {
    case "YUpdate":
      return (
        <YUpdateNodeRenderer
          {...(props as NodeRendererProps<YUpdateTreeNode>)}
        />
      );

    case "YUpdateStruct":
      return (
        <YUpdateStructNodeRenderer
          {...(props as NodeRendererProps<YUpdateStructTreeNode>)}
        />
      );

    case "YUpdateDeleteSet":
      return (
        <YUpdateDeleteSetNodeRenderer
          {...(props as NodeRendererProps<YUpdateDeleteSetTreeNode>)}
        />
      );

    default:
      return null;
  }
}

function jsonChildAccessor(
  node: DevTools.JsonTreeNode
): DevTools.JsonTreeNode[] | null {
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
}

function presenceChildAccessor(
  node: PresenceTreeNode
): PresenceTreeNode[] | null {
  switch (node.type) {
    case "User": {
      //
      // This hardcodes which keys are displayed as top-level properties of User
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
          // Liveblocks Yjs' awareness is part of presence, but we don't want to have it
          // appear in the Presence panel since it has its own panel under the Yjs tab.
          return Object.entries(node.payload)
            .filter(([key]) => key !== "__yjs")
            .flatMap(([key, value]) =>
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
      return assertNever(node, "Unexpected node type");
  }
}

function customEventChildAccessor(
  node: DevTools.JsonTreeNode | DevTools.CustomEventTreeNode
): DevTools.JsonTreeNode[] | null {
  switch (node.type) {
    case "Json":
    case "CustomEvent": {
      if (Array.isArray(node.payload)) {
        return node.payload.map((item, index) =>
          makeJsonNode(node.id, index.toString(), item)
        );
      } else if (node.payload !== null && typeof node.payload === "object") {
        return Object.entries(node.payload).flatMap(([key, value]) =>
          value === undefined ? [] : [makeJsonNode(node.id, key, value)]
        );
      }

      return null;
    }

    default:
      return assertNever(node, "Unexpected node type");
  }
}

function storageChildAccessor(node: StorageTreeNode): StorageTreeNode[] | null {
  switch (node.type) {
    case "LiveList":
    case "LiveMap":
    case "LiveObject":
      return node.payload;

    case "Json":
      return null;

    default:
      // e.g. future LiveXxx types
      return null;
  }
}

function yjsChildAccessor(node: YTreeNode): YTreeNode[] | null {
  switch (node.type) {
    case "Y.Doc":
    case "Y.AbstractType":
    case "Y.Array":
    case "Y.Map":
    case "Y.Text":
    case "Y.XmlText":
    case "Y.XmlElement":
    case "Y.XmlFragment":
      return node.payload;
    case "Y.ContentAny":
    case "Y.ContentBinary":
    case "Y.ContentEmbed":
    case "Y.ContentFormat":
    case "Y.ContentString":
      return null;
  }
}

function yLogsChildAccessor(node: YLogsTreeNode): YLogsTreeNode[] | null {
  switch (node.type) {
    case "YUpdate":
      return node.payload;
    case "YUpdateStruct":
    case "YUpdateDeleteSet":
      return null;
  }
}

function* imapfilter<T>(
  iterable: readonly T[],
  mapFn: (item: T) => T | null
): Iterable<T> {
  for (const item of iterable) {
    const mappedItem = mapFn(item);
    if (mappedItem !== null) {
      yield mappedItem;
    }
  }
}

function mapfilter<T>(
  iterable: readonly T[],
  mapFn: (item: T) => T | null
): T[] {
  return Array.from(imapfilter(iterable, mapFn));
}

/**
 * Determines whether the current node matches or not.
 */
function matchNode(node: DevTools.TreeNode, pattern: RegExp): boolean {
  if (node.type === "User") {
    return Object.keys(node.payload).some((key) => pattern.test(key));
  } else {
    return pattern.test(node.key);
  }
}

/**
 * Returns whether one of the collections was updated. This indicates to the
 * parent call that it should be an indirect match.
 */
function collect(
  node: DevTools.TreeNode,
  pattern: RegExp,
  directMatches: Set<string>,
  indirectMatches: Set<string>
): boolean {
  if (matchNode(node, pattern)) {
    directMatches.add(node.id);
    return true;
  } else {
    // Recursively scan child nodes
    switch (node.type) {
      case "Json":
        // JSON nodes are leafs and have no children
        return false;

      case "LiveList":
      case "LiveObject":
      case "LiveMap": {
        let isIndirectMatch = false;
        for (const childNode of node.payload) {
          if (collect(childNode, pattern, directMatches, indirectMatches)) {
            isIndirectMatch = true;
          }
        }
        if (isIndirectMatch) {
          indirectMatches.add(node.id);
        }
        return isIndirectMatch;
      }

      default:
        // e.g. future LiveXxx types
        return false;
    }
  }
}

function collectMatchingNodes(
  tree: readonly DevTools.TreeNode[],
  pattern: RegExp
): {
  directMatches: Set<string>;
  indirectMatches: Set<string>;
} {
  const directMatches = new Set<string>();
  const indirectMatches = new Set<string>();
  for (const node of tree) {
    collect(node, pattern, directMatches, indirectMatches);
  }
  return {
    directMatches,
    indirectMatches,
  };
}

function pruneNode<TTreeNode extends DevTools.TreeNode>(
  node: TTreeNode,
  directMatches: Set<string>,
  indirectMatches: Set<string>
): TTreeNode | null {
  if (directMatches.has(node.id)) {
    // No sub filtering, keep the entire subtree!
    return node;
  } else if (indirectMatches.has(node.id)) {
    if (node.type === "Json" || node.type === "CustomEvent") {
      //                        🤔 Hmm. This might actually break on old DevTools versions
      throw new Error("Json nodes will never be indirect matches");
    }

    if (node.type === "User") {
      // NOTE:
      // We don't narrow down User rows for now. We don't have full control
      // over the User's child nodes on the rendered Tree, because we _derive_
      // those Json node rows from the actual data inside the User instance.
      // The only way to influence that process is to actually change the JSON
      // data under the `info` and/or `presence` properties of the User. For
      // now, we'll just display everything and hopefully highlighting will be
      // enough.
      return node;
    }

    // _Change_ the node, by pruning non-matching children from it
    return {
      ...node,
      payload: mapfilter(node.payload, (child) =>
        pruneNode(child, directMatches, indirectMatches)
      ),
    };
  } else {
    // No match in the entire subtree
    return null;
  }
}

function pruneTree<TTreeNode extends DevTools.TreeNode>(
  tree: readonly TTreeNode[],
  directMatches: Set<string>,
  indirectMatches: Set<string>
): TTreeNode[] {
  return mapfilter(tree, (node) =>
    pruneNode(node, directMatches, indirectMatches)
  );
}

export function filterNodes<TTreeNode extends DevTools.TreeNode>(
  tree: readonly TTreeNode[],
  pattern: RegExp
): TTreeNode[] {
  const { directMatches, indirectMatches } = collectMatchingNodes(
    tree,
    pattern
  );
  return pruneTree(tree, directMatches, indirectMatches);
}

/**
 * Returns whether one of the collections was updated. This indicates to the
 * parent call that it should be an indirect match.
 */
function collectYNode(
  node: YTreeNode,
  pattern: RegExp,
  directMatches: Set<string>,
  indirectMatches: Set<string>
): boolean {
  if (pattern.test(node.key)) {
    directMatches.add(node.id);
    return true;
  } else {
    // Recursively scan child nodes
    switch (node.type) {
      case "Y.ContentAny":
      case "Y.ContentBinary":
      case "Y.ContentEmbed":
      case "Y.ContentFormat":
      case "Y.ContentString":
        // Yjs Content nodes are leafs and have no children
        return false;

      case "Y.Doc":
      case "Y.AbstractType":
      case "Y.Map":
      case "Y.Array":
      case "Y.Text":
      case "Y.XmlText":
      case "Y.XmlElement":
      case "Y.XmlFragment":
        let isIndirectMatch = false;
        for (const childNode of node.payload) {
          if (
            collectYNode(childNode, pattern, directMatches, indirectMatches)
          ) {
            isIndirectMatch = true;
          }
        }
        if (isIndirectMatch) {
          indirectMatches.add(node.id);
        }
        return isIndirectMatch;
    }
  }
}

function collectMatchingYNodes(
  tree: readonly YTreeNode[],
  pattern: RegExp
): {
  directMatches: Set<string>;
  indirectMatches: Set<string>;
} {
  const directMatches = new Set<string>();
  const indirectMatches = new Set<string>();
  for (const node of tree) {
    collectYNode(node, pattern, directMatches, indirectMatches);
  }
  return {
    directMatches,
    indirectMatches,
  };
}

function pruneYNode(
  node: YTreeNode,
  directMatches: Set<string>,
  indirectMatches: Set<string>
): YTreeNode | null {
  if (directMatches.has(node.id)) {
    // No sub filtering, keep the entire subtree!
    return node;
  } else if (indirectMatches.has(node.id)) {
    if (
      node.type === "Y.ContentAny" ||
      node.type === "Y.ContentString" ||
      node.type === "Y.ContentBinary" ||
      node.type === "Y.ContentEmbed" ||
      node.type === "Y.ContentFormat"
    ) {
      throw new Error("Content nodes will never be indirect matches");
    }

    return {
      ...node,
      payload: mapfilter(node.payload, (child) =>
        pruneYNode(child, directMatches, indirectMatches)
      ),
    } as YTreeNode;
  } else {
    // No match in the entire subtree
    return null;
  }
}

function pruneYTree(
  tree: readonly YTreeNode[],
  directMatches: Set<string>,
  indirectMatches: Set<string>
): YTreeNode[] {
  return mapfilter(tree, (node) =>
    pruneYNode(node, directMatches, indirectMatches)
  );
}

export function filterYNodes(
  tree: readonly YTreeNode[],
  pattern: RegExp
): YTreeNode[] {
  const { directMatches, indirectMatches } = collectMatchingYNodes(
    tree,
    pattern
  );
  return pruneYTree(tree, directMatches, indirectMatches);
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
            "--width": width !== undefined ? `${width}px` : undefined,
            "--height": height !== undefined ? `${height}px` : undefined,
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

export const TreeSearchContext = createContext<RegExp | undefined>(undefined);

export const StorageTree = forwardRef<
  TreeApi<StorageTreeNode>,
  TreeProps<StorageTreeNode> & {
    search?: RegExp;
  }
>(({ search, className, style, ...props }, ref) => {
  return (
    <TreeSearchContext.Provider value={search}>
      <TooltipProvider skipDelayDuration={0}>
        <AutoSizer className={cx(className, "tree")} style={style}>
          {({ width, height }) => (
            <ArboristTree
              ref={ref}
              width={width}
              height={height}
              childrenAccessor={storageChildAccessor}
              disableDrag
              disableDrop
              disableEdit
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
      </TooltipProvider>
    </TreeSearchContext.Provider>
  );
});

export const YjsTree = forwardRef<
  TreeApi<YTreeNode>,
  ArboristTreeProps<YTreeNode> & {
    search?: RegExp;
    style?: CSSProperties;
  }
>(({ search, className, style, ...props }, ref) => {
  return (
    <TreeSearchContext.Provider value={search}>
      <TooltipProvider skipDelayDuration={0}>
        <AutoSizer className={cx(className, "tree")} style={style}>
          {({ width, height }) => (
            <ArboristTree
              ref={ref}
              width={width}
              height={height}
              childrenAccessor={yjsChildAccessor}
              disableDrag
              disableDrop
              disableEdit
              disableMultiSelection
              className="!overflow-x-hidden"
              selectionFollowsFocus
              rowHeight={ROW_HEIGHT}
              indent={ROW_INDENT}
              openByDefault={false}
              {...props}
            >
              {YNodeRenderer}
            </ArboristTree>
          )}
        </AutoSizer>
      </TooltipProvider>
    </TreeSearchContext.Provider>
  );
});

export const YLogsTree = forwardRef<
  TreeApi<YLogsTreeNode>,
  TreeProps<YLogsTreeNode> & {
    search?: RegExp;
  }
>(({ search, className, style, ...props }, ref) => {
  return (
    <TreeSearchContext.Provider value={search}>
      <TooltipProvider skipDelayDuration={0}>
        <AutoSizer className={cx(className, "tree")} style={style}>
          {({ width, height }) => (
            <ArboristTree
              ref={ref}
              width={width}
              height={height}
              childrenAccessor={yLogsChildAccessor}
              disableDrag
              disableDrop
              disableEdit
              disableMultiSelection
              className="!overflow-x-hidden"
              selectionFollowsFocus
              rowHeight={ROW_HEIGHT}
              indent={ROW_INDENT}
              {...props}
            >
              {YLogsNodeRenderer}
            </ArboristTree>
          )}
        </AutoSizer>
      </TooltipProvider>
    </TreeSearchContext.Provider>
  );
});

export const PresenceTree = forwardRef<
  TreeApi<PresenceTreeNode>,
  TreeProps<PresenceTreeNode>
>(({ className, style, ...props }, ref) => {
  return (
    <TooltipProvider skipDelayDuration={0}>
      <AutoSizer className={cx(className, "tree")} style={style}>
        {({ width, height }) => (
          <ArboristTree
            ref={ref}
            width={width}
            height={height}
            childrenAccessor={presenceChildAccessor}
            disableDrag
            disableDrop
            disableEdit
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
    </TooltipProvider>
  );
});

export const JsonTree = forwardRef<
  TreeApi<DevTools.JsonTreeNode>,
  TreeProps<DevTools.JsonTreeNode>
>(({ className, style, ...props }, ref) => {
  return (
    <TooltipProvider skipDelayDuration={0}>
      <AutoSizer className={cx(className, "tree")} style={style}>
        {({ width, height }) => (
          <ArboristTree
            ref={ref}
            width={width}
            height={height}
            childrenAccessor={jsonChildAccessor}
            disableDrag
            disableDrop
            disableEdit
            disableMultiSelection
            className="!overflow-x-hidden"
            selectionFollowsFocus
            rowHeight={ROW_HEIGHT}
            indent={ROW_INDENT}
            {...props}
          >
            {JsonNodeRenderer}
          </ArboristTree>
        )}
      </AutoSizer>
    </TooltipProvider>
  );
});

export const CustomEventsTree = forwardRef<
  TreeApi<DevTools.CustomEventTreeNode | DevTools.JsonTreeNode>,
  TreeProps<DevTools.CustomEventTreeNode | DevTools.JsonTreeNode>
>(({ className, style, ...props }, ref) => {
  return (
    <TooltipProvider skipDelayDuration={0}>
      <AutoSizer className={cx(className, "tree")} style={style}>
        {({ width, height }) => (
          <ArboristTree
            ref={ref}
            width={width}
            height={height}
            childrenAccessor={customEventChildAccessor}
            disableDrag
            disableDrop
            disableEdit
            disableMultiSelection
            className="!overflow-x-hidden"
            openByDefault={false}
            selectionFollowsFocus
            rowHeight={ROW_HEIGHT}
            indent={ROW_INDENT}
            {...props}
          >
            {CustomEventNodeRenderer}
          </ArboristTree>
        )}
      </AutoSizer>
    </TooltipProvider>
  );
});

/**
 * Returns the list of nodes, from the root (excluded) all the way down to the
 * current node (included). The current node will always be last in this list.
 *
 * The root node itself is excluded because it's an internal Arborist node
 * (invisible in the tree view).
 */
export function getNodePath<T>(node: NodeApi<T>): NodeApi<T>[] {
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

export function CaretRightIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="8"
      height="8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2 6.117V1.883a.5.5 0 0 1 .757-.429l3.528 2.117a.5.5 0 0 1 0 .858L2.757 6.546A.5.5 0 0 1 2 6.116Z"
        fill="currentColor"
      />
    </svg>
  );
}
