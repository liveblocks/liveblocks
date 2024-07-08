import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata, DM, ThreadData } from "@liveblocks/core";
import {
  Thread as _DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import { $getNodeByKey } from "lexical";
import type { ComponentType, HTMLAttributes } from "react";
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { classNames } from "../classnames";
import { useRootElement } from "../liveblocks-plugin-provider";
import {
  ActiveThreadsContext,
  type ThreadToNodesMap,
} from "./comment-plugin-provider";
import { ThreadToNodesContext } from "./comment-plugin-provider";
import { $isThreadMarkNode } from "./thread-mark-node";

const DEFAULT_GAP = 20;

function DefaultThread({ thread, ...props }: ThreadProps) {
  const activeThreads = useActiveThreads();
  const isActive = activeThreads.includes(thread.id);

  return (
    <_DefaultThread
      thread={thread}
      showComposer={isActive ? true : false}
      {...props}
    />
  );
}

type ThreadPanelComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface ThreadsPanelProps<M extends BaseMetadata = DM>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  threads: ThreadData<M>[];
  /**
   * The gap between threads.
   * @default 20
   */
  gap?: number;
  /**
   * Override the component's components.
   */
  components?: Partial<ThreadPanelComponents>;
}

export function ThreadsPanel({
  threads,
  gap = DEFAULT_GAP,
  components,
  className,
  style,
  ...divProps
}: ThreadsPanelProps) {
  const [editor] = useLexicalComposerContext();
  const Thread = components?.Thread ?? DefaultThread;
  const containerRef = useRef<HTMLDivElement>(null);

  const activeThreads = useActiveThreads();

  const nodes = useThreadToNodes(); // A map of thread ids to a set of thread mark nodes associated with the thread

  // Sort threads by the position of the first element associated with the thread in the document (top to bottom, left to right)
  const orderedThreads = useMemo(() => {
    return (
      threads
        // Map each thread to an object containing the thread and the rect of the first element associated with the thread
        .map((thread) => {
          // Retrieve all keys of nodes associated with the thread
          const keys = nodes.get(thread.id);
          if (keys === undefined || keys.size === 0) return null;

          // Retrieve all elements associated with the keys and sort them by their position in the document (top to bottom, left to right)
          const rects = Array.from(keys.values())
            .map((key) => {
              const element = editor.getElementByKey(key);
              if (element === null) return null;
              return element.getBoundingClientRect();
            })
            .filter((rect): rect is DOMRect => rect !== null)
            .sort((a, b) => {
              if (a.top < b.top) return -1;
              if (a.top > b.top) return 1;

              return a.left - b.left;
            });

          if (rects.length === 0) return null;

          return {
            thread,
            rect: rects[0],
          };
        })
        .filter(
          (entry): entry is { thread: ThreadData; rect: DOMRect } =>
            entry !== null
        )
        // Sort threads by the position of the (first) thread mark node in the document
        .sort((a, b) => {
          if (a.rect.top < b.rect.top) return -1;
          if (a.rect.top > b.rect.top) return 1;

          return a.rect.left - b.rect.left;
        })
    );
  }, [editor, threads, nodes]);

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

    const orderedThreads = threads
      // Map each thread to an object containing the thread and the rect of the first element associated with the thread
      .map((thread) => {
        // Retrieve all keys of nodes associated with the thread
        const keys = nodes.get(thread.id);
        if (keys === undefined || keys.size === 0) return null;

        // Retrieve all elements associated with the keys and sort them by their position in the document (top to bottom, left to right)
        const rects = Array.from(keys.values())
          .map((key) => {
            const element = editor.getElementByKey(key);
            if (element === null) return null;
            return element.getBoundingClientRect();
          })
          .filter((rect): rect is DOMRect => rect !== null)
          .sort((a, b) => {
            if (a.top < b.top) return -1;
            if (a.top > b.top) return 1;

            return a.left - b.left;
          });

        if (rects.length === 0) return null;

        return {
          thread,
          rect: rects[0],
        };
      })
      .filter(
        (entry): entry is { thread: ThreadData; rect: DOMRect } =>
          entry !== null
      )
      // Sort threads by the position of the (first) thread mark node in the document
      .sort((a, b) => {
        if (a.rect.top < b.rect.top) return -1;
        if (a.rect.top > b.rect.top) return 1;

        return a.rect.left - b.rect.left;
      });

    // Returns an array of threads that should be positioned in ascending order - this includes threads that are active and threads that should come after the active threads
    function getAscendingThreads() {
      // If there are no active threads, all threads are ordered in ascending manner.
      if (activeThreads.length === 0) return orderedThreads;

      // Filter threads that are active
      const active = orderedThreads.filter(({ thread }) =>
        activeThreads.includes(thread.id)
      );

      // Filter threads that should come after the active threads
      const after = orderedThreads.filter(({ thread, rect }) => {
        if (activeThreads.includes(thread.id)) return false;

        // Check if the current thread comes after any of the active threads
        const isAfter = active.some(({ rect: activeRect }) => {
          if (rect.top < activeRect.top) return false;
          if (rect.top > activeRect.top) return true;

          return rect.left > activeRect.left;
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
    for (const { thread, rect } of ascending) {
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

    for (const { thread, rect } of descending.reverse()) {
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
  }, [editor, threads, nodes, activeThreads, elements]);

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

  if (orderedThreads.length === 0) return;

  return (
    <div
      {...divProps}
      className={classNames(className, "lb-root lb-lexical-thread-panel")}
      ref={containerRef}
      style={{
        position: "relative",
        ...style,
      }}
    >
      {orderedThreads.map(({ thread, rect }) => {
        let top = rect.top;

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
              transform: `translateX(${isActive ? -12 : 0}px) translateY(${top}px)`,
              left: 0,
              width: "100%",
              paddingBottom: gap,
              transition: "transform 0.2s",
            }}
          />
        );
      })}
    </div>
  );
}

interface ThreadWrapperProps extends ThreadProps {
  Thread: ComponentType<ThreadProps>;
}

interface ThreadWrapperProps extends HTMLAttributes<HTMLDivElement> {
  onItemAdd: (id: string, el: HTMLElement) => void;
  onItemRemove: (id: string) => void;
}

function ThreadWrapper({
  onItemAdd,
  onItemRemove,
  thread,
  Thread,
  ...divProps
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

    editor.update(
      () => {
        const [key] = keys;
        const node = $getNodeByKey(key);
        if (!$isThreadMarkNode(node)) return;
        node.selectStart();
      },
      {
        onUpdate: () => {
          const container = divRef.current;
          if (container === null) return;

          const composer = container.querySelector(".lb-composer-editor");
          if (composer !== null) {
            if (!(composer instanceof HTMLElement)) return;
            composer.focus();
          }
          // If the composer is not found (and this can happen if `showComposer` is set to `false`), wait for the next render and try again to focus the composer.
          else {
            setTimeout(() => {
              const composer = container.querySelector(".lb-composer-editor");
              if (composer === null) return;
              if (!(composer instanceof HTMLElement)) return;
              composer.focus();
            }, 0);
          }
        },
      }
    );
  }

  useLayoutEffect(() => {
    const div = divRef.current;
    if (div === null) return;

    onItemAdd(thread.id, div);
    return () => onItemRemove(thread.id);
  }, [thread.id, onItemAdd, onItemRemove]);

  return (
    <div ref={divRef} {...divProps}>
      <Thread
        thread={thread}
        data-state={isActive ? "active" : "inactive"}
        onClick={handleThreadClick}
        className={"lb-lexical-threads-panel-thread lb-elevation"}
      />
    </div>
  );
}

function useThreadToNodes(): ThreadToNodesMap {
  const threadToNodes = useContext(ThreadToNodesContext);
  if (threadToNodes === null) {
    throw new Error(
      "ThreadsPanel component must be used within a LiveblocksPlugin component."
    );
  }
  return threadToNodes;
}

function useActiveThreads() {
  const activeThreads = useContext(ActiveThreadsContext);
  if (activeThreads === null) {
    throw new Error("ThreadsPanel must be used within LiveblocksPlugin.");
  }

  return activeThreads;
}
