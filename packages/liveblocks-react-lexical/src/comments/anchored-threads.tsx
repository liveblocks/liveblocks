import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata, ThreadData } from "@liveblocks/client";
import type { DCM, DTM } from "@liveblocks/core";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  Thread as DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import { cn } from "@liveblocks/react-ui/_private";
import { $getNodeByKey } from "lexical";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRootElement } from "../use-root-element";
import {
  ActiveThreadsContext,
  type ThreadToNodesMap,
} from "./comment-plugin-provider";
import { ThreadToNodesContext } from "./comment-plugin-provider";
import { $isThreadMarkNode } from "./thread-mark-node";

const DEFAULT_GAP = 20;
const DEFAULT_ACTIVE_THREAD_OFFSET = -12;

const GAP = `var(--lb-lexical-anchored-threads-gap, ${DEFAULT_GAP}px)`;
const ACTIVE_THREAD_OFFSET = `var(--lb-lexical-anchored-threads-active-thread-offset, ${DEFAULT_ACTIVE_THREAD_OFFSET}px)`;

type AnchoredThreadsComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface AnchoredThreadsProps<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /**
   * The threads to display.
   */
  threads: ThreadData<TM, CM>[];

  /**
   * Override the component's components.
   */
  components?: Partial<AnchoredThreadsComponents>;
}

/**
 * Compares two nodes based on their position in the DOM.
 * Returns -1 if a comes before b, 1 if a comes after b, and 0 if they are the same node.
 * @param a The first node to compare
 * @param b The second node to compare
 * @returns -1 if a comes before b, 1 if a comes after b, and 0 if they are the same node.
 */
export function compareNodes(a: Node, b: Node): number {
  // Calculate the position of node 'b' relative to node 'a'
  const position = a.compareDocumentPosition(b);
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

export function AnchoredThreads({
  threads,
  components,
  className,
  style,
  ...props
}: AnchoredThreadsProps) {
  const [editor] = useLexicalComposerContext();
  const Thread = components?.Thread ?? DefaultThread;
  const containerRef = useRef<HTMLDivElement>(null);

  const activeThreads = useActiveThreads();

  const nodes = useThreadToNodes(); // A map of thread ids to a set of thread mark nodes associated with the thread

  const getOrderedThreads = useCallback(() => {
    return threads
      .filter((thread) => thread.resolved === false)
      .map((thread) => {
        const keys = nodes.get(thread.id);
        if (keys === undefined || keys.size === 0) return null;

        const elements = Array.from(keys.values())
          .map((key) => editor.getElementByKey(key))
          .filter(Boolean) as HTMLElement[];
        if (elements.length === 0) return null;

        const element = elements.sort(compareNodes)[0];
        return {
          thread,
          element,
        };
      })
      .filter(
        (entry): entry is { thread: ThreadData; element: HTMLElement } =>
          entry !== null
      )
      .sort((a, b) => {
        return compareNodes(a.element, b.element);
      });
  }, [editor, threads, nodes]);

  // Sort threads by the position of the first element associated with the thread in the document (top to bottom, left to right)
  const orderedThreads = useMemo(getOrderedThreads, [getOrderedThreads]);

  const [elements, setElements] = useState<Map<string, HTMLElement>>(new Map());

  const [positions, setPositions] = useState<Map<string, number>>(new Map()); // A map of thread ids to their 'top' position in the document

  const onItemAdd = useCallback((id: string, el: HTMLElement) => {
    setElements((prev) => new Map(prev).set(id, el));
  }, []);

  const onItemRemove = useCallback((id: string) => {
    setElements((prev) => {
      const items = new Map(prev);
      items.delete(id);
      return items;
    });
  }, []);

  const handlePositionThreads = useCallback(() => {
    const container = containerRef.current;
    if (container === null) return;

    const orderedThreads = getOrderedThreads();

    // Returns an array of threads that should be positioned in ascending order - this includes threads that are active and threads that should come after the active threads
    function getAscendingThreads() {
      // If there are no active threads, all threads are ordered in ascending manner.
      if (activeThreads.length === 0) return orderedThreads;

      // Filter threads that are active
      const active = orderedThreads.filter(({ thread }) =>
        activeThreads.includes(thread.id)
      );

      // Filter threads that should come after the active threads
      const after = orderedThreads.filter(({ thread, element }) => {
        if (activeThreads.includes(thread.id)) return false;

        // Check if the current thread comes after any of the active threads
        const isAfter = active.some(({ element: activeElement }) => {
          return compareNodes(activeElement, element) === -1;
        });

        return isAfter;
      });

      return active.concat(after);
    }

    const ascending = getAscendingThreads();

    // Filter threads that are neither active nor come after active threads (i.e. 'other' threads)
    const descending = orderedThreads.filter(
      (entry) => !ascending.includes(entry)
    );

    const newPositions = new Map<string, number>();

    // Iterate over each thread and calculate its new position by taking into account the position of the previously positioned threads
    for (const { thread, element } of ascending) {
      const rect = element.getBoundingClientRect();
      let top = rect.top - container.getBoundingClientRect().top;

      for (const [id, position] of newPositions) {
        // Retrieve the element associated with the thread
        const el = elements.get(id);
        if (el === undefined) continue;

        if (
          top >= position &&
          top <= position + el.getBoundingClientRect().height
        ) {
          top = position + el.getBoundingClientRect().height;
        }
      }

      newPositions.set(thread.id, top);
    }

    for (const { thread, element } of descending.reverse()) {
      const rect = element.getBoundingClientRect();
      // Retrieve the element associated with the current thread
      const el = elements.get(thread.id);
      if (el === undefined) continue;

      let top = rect.top - container.getBoundingClientRect().top;
      for (const [, position] of newPositions) {
        if (top >= position - el.getBoundingClientRect().height) {
          top = position - el.getBoundingClientRect().height;
        }
      }

      newPositions.set(thread.id, top);
    }

    setPositions(newPositions);
  }, [getOrderedThreads, activeThreads, elements]);

  useLayoutEffect(() => {
    handlePositionThreads();
  }, [handlePositionThreads]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      handlePositionThreads();
    });
  }, [editor, handlePositionThreads]);

  useEffect(() => {
    const observer = new ResizeObserver(handlePositionThreads);
    for (const element of elements.values()) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [elements, handlePositionThreads]);

  const root = useRootElement();

  useEffect(() => {
    if (root === null) return;
    const observer = new ResizeObserver(handlePositionThreads);

    observer.observe(root);
    return () => observer.disconnect();
  }, [root, handlePositionThreads]);

  if (orderedThreads.length === 0) return null;

  return (
    <div
      {...props}
      className={cn(className, "lb-root lb-lexical-anchored-threads")}
      ref={containerRef}
      style={{
        position: "relative",
        ...style,
      }}
    >
      {orderedThreads.map(({ thread, element }) => {
        const rect = element.getBoundingClientRect();
        const offset = root !== null ? root.getBoundingClientRect().top : 0;

        let top = rect.top - offset;

        if (positions.has(thread.id)) {
          top = positions.get(thread.id)!;
        }

        const isActive = activeThreads.includes(thread.id);

        return (
          <ThreadWrapper
            key={thread.id}
            Thread={Thread}
            thread={thread}
            onItemAdd={onItemAdd}
            onItemRemove={onItemRemove}
            style={{
              position: "absolute",
              transform: `translate3d(${isActive ? ACTIVE_THREAD_OFFSET : 0}, ${top}px, 0)`,
              insetInlineStart: 0,
              inlineSize: "100%",
              paddingBlockEnd: GAP,
            }}
          />
        );
      })}
    </div>
  );
}

interface ThreadWrapperProps extends ThreadProps {
  Thread: ComponentType<ThreadProps>;
  onItemAdd: (id: string, el: HTMLElement) => void;
  onItemRemove: (id: string) => void;
}

function ThreadWrapper({
  onItemAdd,
  onItemRemove,
  thread,
  Thread,
  className,
  ...props
}: ThreadWrapperProps) {
  const [editor] = useLexicalComposerContext();
  const nodes = useThreadToNodes();
  const divRef = useRef<HTMLDivElement>(null);

  const activeThreads = useActiveThreads();

  const isActive = activeThreads.includes(thread.id);

  function handleThreadClick() {
    const keys = nodes.get(thread.id);
    if (keys === undefined || keys.size === 0) return;

    if (activeThreads.includes(thread.id)) return;

    editor.update(() => {
      const [key] = keys;
      const node = $getNodeByKey(key);
      if (!$isThreadMarkNode(node)) return;
      node.selectStart();
    });
  }

  useLayoutEffect(() => {
    const el = divRef.current;
    if (el === null) return;

    onItemAdd(thread.id, el);
    return () => {
      onItemRemove(thread.id);
    };
  }, [thread.id, onItemAdd, onItemRemove]);

  return (
    <div
      ref={divRef}
      className={cn("lb-lexical-anchored-threads-thread-container", className)}
      {...props}
    >
      <Thread
        thread={thread}
        data-state={isActive ? "active" : "inactive"}
        onClick={handleThreadClick}
        className="lb-lexical-anchored-threads-thread"
        showComposer={isActive ? true : false}
      />
    </div>
  );
}

function useThreadToNodes(): ThreadToNodesMap {
  const threadToNodes = useContext(ThreadToNodesContext);
  if (threadToNodes === null) {
    throw new Error(
      "AnchoredThreads component must be used within a LiveblocksPlugin component."
    );
  }
  return threadToNodes;
}

function useActiveThreads() {
  const activeThreads = useContext(ActiveThreadsContext);
  if (activeThreads === null) {
    throw new Error(
      "AnchoredThreads component must be used within LiveblocksPlugin."
    );
  }

  return activeThreads;
}
