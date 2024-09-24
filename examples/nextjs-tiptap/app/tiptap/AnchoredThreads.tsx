import type { BaseMetadata, DM, ThreadData } from "@liveblocks/core";
import {
  Thread as DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Editor } from "@tiptap/react";

import { classNames } from "./classnames";
import { ThreadPluginActions, ThreadPluginState, THREADS_PLUGIN_KEY } from "./LiveblocksExtension";
import { getRectFromCoords } from "./utils";

const DEFAULT_GAP = 20;
const DEFAULT_ACTIVE_THREAD_OFFSET = -12;

// TODO: move that back to a variable
const GAP = `var(--lb-lexical-anchored-threads-gap, ${DEFAULT_GAP}px)`;
const ACTIVE_THREAD_OFFSET = `var(--lb-lexical-anchored-threads-active-thread-offset, ${DEFAULT_ACTIVE_THREAD_OFFSET}px)`;

type AnchoredThreadsComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface AnchoredThreadsProps<M extends BaseMetadata = DM>
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /**
   * The threads to display.
   */
  threads: ThreadData<M>[];

  /**
   * Override the component's components.
   */
  components?: Partial<AnchoredThreadsComponents>;
  /**
   * The tiptap editor
   */
  editor: Editor | null;
}

export function AnchoredThreads({
  threads,
  components,
  className,
  style,
  editor,
  ...props
}: AnchoredThreadsProps) {
  const Thread = components?.Thread ?? DefaultThread;
  const containerRef = useRef<HTMLDivElement>(null);
  const [orderedThreads, setOrderedThreads] = useState<{ position: { from: number, to: number }, thread: ThreadData }[]>([]);
  const [elements, setElements] = useState<Map<string, HTMLElement>>(new Map());
  const [positions, setPositions] = useState<Map<string, number>>(new Map()); // A map of thread ids to their 'top' position in the document

  const pluginState = editor ? THREADS_PLUGIN_KEY.getState(editor.state) as ThreadPluginState : null;
  if (!editor) return null;

  // TODO: lexical supoprts multiple threads being active, should probably do that here as well
  const handlePositionThreads = useCallback(() => {
    const container = containerRef.current;
    if (container === null) return;

    const activeIndex = orderedThreads.findIndex(({ thread }) =>
      thread.id === pluginState?.selectedThreadId
    );
    const ascending = activeIndex !== -1 ? orderedThreads.slice(activeIndex) : orderedThreads;
    const descending = activeIndex !== -1 ? orderedThreads.slice(0, activeIndex) : [];

    const newPositions = new Map<string, number>();

    // Iterate over each thread and calculate its new position by taking into account the position of the previously positioned threads
    for (const { thread, position } of ascending) {
      const coords = editor.view.coordsAtPos(position.from);
      const rect = getRectFromCoords(coords);
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

    for (const { thread, position } of descending.reverse()) {
      const coords = editor.view.coordsAtPos(position.from);
      const rect = getRectFromCoords(coords);
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
  }, [pluginState?.selectedThreadId, orderedThreads, elements]);

  useEffect(() => {
    if (!pluginState) return;
    setOrderedThreads(Array.from(pluginState.threadPositions, ([threadId, position]) => ({ threadId, position })).reduce((acc, { threadId, position }) => {
      const thread = threads.find((thread) => thread.id === threadId);
      if (!thread) return acc;
      acc.push({ thread, position });
      return acc;
    }, [] as { thread: ThreadData, position: { from: number, to: number } }[]));
    handlePositionThreads();
  }, [pluginState]);


  useLayoutEffect(() => {
    handlePositionThreads();
  }, [handlePositionThreads]);

  useEffect(() => {
    const observer = new ResizeObserver(handlePositionThreads);
    for (const element of elements.values()) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [elements, handlePositionThreads]);

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

  const onThreadSelect = useCallback((id: string) => {
    if (!editor) return;
    // TODO: should we refactor this into a plugin command?
    editor.view.dispatch(
      editor.state.tr.setMeta(THREADS_PLUGIN_KEY, {
        name: ThreadPluginActions.SET_SELECTED_THREAD_ID,
        data: id,
      })
    );
  }, [editor]);


  return (
    <div
      {...props}
      className={classNames(className, "lb-root lb-lexical-anchored-threads")}
      ref={containerRef}
      style={{
        position: "relative",
        ...style,
      }}
    >
      {orderedThreads.map(({ thread, position }) => {
        const coords = editor.view.coordsAtPos(Math.min(position.from, editor.state.doc.content.size - 1));
        const rect = getRectFromCoords(coords);
        const offset = editor.options.element.getBoundingClientRect().top;

        let top = rect.top - offset;

        if (positions.has(thread.id)) {
          top = positions.get(thread.id)!;
        }

        const isActive = thread.id === pluginState?.selectedThreadId;

        return (
          <ThreadWrapper
            key={thread.id}
            onThreadClick={onThreadSelect}
            onItemAdd={onItemAdd}
            onItemRemove={onItemRemove}
            Thread={Thread}
            thread={thread}
            isActive={isActive}
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
  onThreadClick: (id: string) => void;
  onItemAdd: (id: string, el: HTMLElement) => void;
  onItemRemove: (id: string) => void;
  isActive: boolean;
}

function ThreadWrapper({
  onThreadClick,
  onItemAdd,
  onItemRemove,
  thread,
  Thread,
  className,
  isActive,
  ...props
}: ThreadWrapperProps) {

  const handleRef = useCallback(
    (el: HTMLDivElement) => {
      onItemAdd(thread.id, el);
      return () => onItemRemove(thread.id);
    },
    [thread.id, onItemAdd, onItemRemove]
  );


  function handleThreadClick() {
    onThreadClick(thread.id);
  }

  return (
    <div
      ref={handleRef}
      className={classNames(
        "lb-lexical-anchored-threads-thread-container",
        className
      )}
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
