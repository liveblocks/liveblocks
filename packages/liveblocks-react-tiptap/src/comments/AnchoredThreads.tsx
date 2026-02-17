import type { BaseMetadata, DCM, DTM, ThreadData } from "@liveblocks/core";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  Thread as DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import { cn } from "@liveblocks/react-ui/_private";
import { type Editor, useEditorState } from "@tiptap/react";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { THREADS_PLUGIN_KEY } from "../types";
import { getRectFromCoords } from "../utils";

const DEFAULT_GAP = 20;
const DEFAULT_ACTIVE_THREAD_OFFSET = -12;

// TODO: move that back to a variable
const GAP = `var(--lb-tiptap-anchored-threads-gap, ${DEFAULT_GAP}px)`;
const ACTIVE_THREAD_OFFSET = `var(--lb-tiptap-anchored-threads-active-thread-offset, ${DEFAULT_ACTIVE_THREAD_OFFSET}px)`;

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

  /**
   * The Tiptap editor.
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
  const [orderedThreads, setOrderedThreads] = useState<
    { position: { from: number; to: number }; thread: ThreadData }[]
  >([]);
  const [elements, setElements] = useState<Map<string, HTMLElement>>(new Map());
  const [positions, setPositions] = useState<Map<string, number>>(new Map()); // A map of thread ids to their 'top' position in the document

  const { pluginState } = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx?.editor?.state) return { pluginState: undefined };
      const state = THREADS_PLUGIN_KEY.getState(ctx.editor.state);
      return {
        pluginState: state,
      };
    },
    equalityFn: (prev, next) => {
      if (!prev || !next) return false;
      return (
        prev.pluginState?.selectedThreadId ===
          next.pluginState?.selectedThreadId &&
        prev.pluginState?.threadPositions === next.pluginState?.threadPositions
      ); // new map is made each time threadPos updates so shallow equality is fine
    },
  }) ?? { pluginState: undefined };

  // TODO: lexical supoprts multiple threads being active, should probably do that here as well
  const handlePositionThreads = useCallback(() => {
    const container = containerRef.current;
    if (container === null || !editor || !editor.view) return;

    const activeIndex = orderedThreads.findIndex(
      ({ thread }) => thread.id === pluginState?.selectedThreadId
    );
    const ascending =
      activeIndex !== -1 ? orderedThreads.slice(activeIndex) : orderedThreads;
    const descending =
      activeIndex !== -1 ? orderedThreads.slice(0, activeIndex) : [];

    const newPositions = new Map<string, number>();

    // Iterate over each thread and calculate its new position by taking into account the position of the previously positioned threads
    for (const { thread, position } of ascending) {
      const coords = editor.view.coordsAtPos(
        Math.min(position.from, editor.view.state.doc.content.size - 1)
      );
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
  }, [editor, orderedThreads, pluginState?.selectedThreadId, elements]);

  useEffect(() => {
    if (!pluginState) return;
    setOrderedThreads(
      Array.from(pluginState.threadPositions, ([threadId, position]) => ({
        threadId,
        position,
      })).reduce(
        (acc, { threadId, position }) => {
          const thread = threads.find(
            (thread) => thread.id === threadId && !thread.resolved
          );
          if (!thread) return acc;
          acc.push({ thread, position });
          return acc;
        },
        [] as { thread: ThreadData; position: { from: number; to: number } }[]
      )
    );
    handlePositionThreads();
    // disable exhaustive deps because we don't want an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginState, threads]);

  useLayoutEffect(handlePositionThreads, [handlePositionThreads]);

  useEffect(() => {
    const observer = new ResizeObserver(handlePositionThreads);
    const container = editor?.view?.dom;
    if (container) {
      observer.observe(container);
    }
    for (const element of elements.values()) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [elements, editor, handlePositionThreads]);

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

  const onThreadSelect = useCallback(
    (id: string) => {
      if (!editor) return;
      editor.commands.selectThread(id);
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div
      {...props}
      className={cn(className, "lb-root lb-tiptap-anchored-threads")}
      ref={containerRef}
      style={{
        position: "relative",
        ...style,
      }}
    >
      {orderedThreads.map(({ thread, position }) => {
        // In blocknote, it's possible for this to be undefined
        if (!editor.view) {
          return null;
        }
        const coords = editor.view.coordsAtPos(
          Math.min(position.from, editor.state.doc.content.size - 1)
        );
        const rect = getRectFromCoords(coords);
        let offset = 0;
        if (editor.options.element instanceof HTMLElement) {
          offset = editor.options.element.getBoundingClientRect().top;
        }

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
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = divRef.current;
    if (el === null) return;

    onItemAdd(thread.id, el);
    return () => {
      onItemRemove(thread.id);
    };
  }, [onItemAdd, onItemRemove, thread.id]);

  function handleThreadClick() {
    onThreadClick(thread.id);
  }

  return (
    <div
      ref={divRef}
      className={cn("lb-tiptap-anchored-threads-thread-container", className)}
      {...props}
    >
      <Thread
        thread={thread}
        data-state={isActive ? "active" : "inactive"}
        onClick={handleThreadClick}
        className="lb-tiptap-anchored-threads-thread"
        showComposer={isActive ? true : false}
      />
    </div>
  );
}
