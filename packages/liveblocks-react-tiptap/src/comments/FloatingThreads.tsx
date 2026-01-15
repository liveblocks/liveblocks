import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import type { BaseMetadata, DCM, DTM, ThreadData } from "@liveblocks/core";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  Thread as DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import { cn } from "@liveblocks/react-ui/_private";
import { type Editor, useEditorState } from "@tiptap/react";
import {
  type ComponentType,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { THREADS_PLUGIN_KEY } from "../types";

type FloatingThreadsComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface FloatingThreadsProps<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The threads to display.
   */
  threads: ThreadData<TM, CM>[];

  /**
   * Override the component's components.
   */
  components?: Partial<FloatingThreadsComponents>;

  /**
   * The Tiptap editor.
   */
  editor: Editor | null;
}

export function FloatingThreads({
  threads,
  components,
  editor,
  ...props
}: FloatingThreadsProps) {
  const Thread = components?.Thread ?? DefaultThread;

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
        prev.pluginState?.selectedThreadPos ===
          next.pluginState?.selectedThreadPos &&
        prev.pluginState?.selectedThreadId ===
          next.pluginState?.selectedThreadId
      );
    },
  }) ?? { pluginState: undefined };

  const [activeThread, setActiveThread] = useState<ThreadData | null>(null);

  useEffect(() => {
    if (!editor || !pluginState) {
      setActiveThread(null);
      return;
    }
    const { selectedThreadId, selectedThreadPos } = pluginState;
    if (selectedThreadId === null || selectedThreadPos === null) {
      setActiveThread(null);
      return;
    }
    const active = (threads ?? []).find(
      (thread) => selectedThreadId === thread.id
    );
    setActiveThread(active ?? null);
  }, [editor, pluginState, threads]);

  const handleEscapeKeydown = useCallback((): boolean => {
    if (!editor || activeThread === null) return false;
    editor.commands.selectThread(null);
    return true;
  }, [activeThread, editor]);

  if (!activeThread || !editor || activeThread.resolved) return null;

  return (
    <FloatingThreadPortal
      thread={activeThread}
      editor={editor}
      container={document.body}
      {...props}
    >
      {activeThread && (
        <ThreadWrapper
          key={activeThread.id}
          thread={activeThread}
          Thread={Thread}
          onEscapeKeydown={handleEscapeKeydown}
          className="lb-tiptap-floating-threads-thread"
        />
      )}
    </FloatingThreadPortal>
  );
}

interface FloatingThreadPortalProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  thread: ThreadData;
  editor: Editor;
  container: HTMLElement;
  children: ReactNode;
}

export const FLOATING_THREAD_COLLISION_PADDING = 10;

function FloatingThreadPortal({
  container,
  editor,
  thread,
  children,
  className,
  style,
  ...props
}: FloatingThreadPortalProps) {
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "absolute",
    placement: "bottom",
    middleware: [
      flip({ padding: FLOATING_THREAD_COLLISION_PADDING, crossAxis: false }),
      offset(10),
      hide({ padding: FLOATING_THREAD_COLLISION_PADDING }),
      shift({
        padding: FLOATING_THREAD_COLLISION_PADDING,
        limiter: limitShift(),
      }),
      size({
        padding: FLOATING_THREAD_COLLISION_PADDING,
        apply({ availableWidth, availableHeight, elements }) {
          elements.floating.style.setProperty(
            "--lb-tiptap-floating-threads-available-width",
            `${availableWidth}px`
          );
          elements.floating.style.setProperty(
            "--lb-tiptap-floating-threads-available-height",
            `${availableHeight}px`
          );
        },
      }),
    ],
    whileElementsMounted: (...args) => {
      return autoUpdate(...args, {
        animationFrame: true,
      });
    },
  });

  const updateRef = useCallback(() => {
    const el = editor.view.dom.querySelector(
      `[data-lb-thread-id="${thread.id}"]`
    );
    if (el) {
      setReference(el);
    }
  }, [setReference, editor, thread.id]);

  // Remote cursor updates and other edits can cause the ref to break
  useEffect(() => {
    editor.on("transaction", updateRef);
    return () => {
      editor.off("transaction", updateRef);
    };
  }, [editor, updateRef]);

  useLayoutEffect(updateRef, [updateRef]);

  return createPortal(
    <div
      ref={setFloating}
      {...props}
      style={{
        ...style,
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}
      className={cn(
        "lb-root lb-portal lb-elevation lb-tiptap-floating lb-tiptap-floating-threads",
        className
      )}
    >
      {children}
    </div>,
    container
  );
}

interface ThreadWrapperProps extends ThreadProps {
  thread: ThreadData;
  Thread: ComponentType<ThreadProps>;
  onEscapeKeydown: () => void;
}

function ThreadWrapper({
  thread,
  Thread,
  onEscapeKeydown,
  onKeyDown,
  ...threadProps
}: ThreadWrapperProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);

      // TODO: Add ability to preventDefault on keydown to override the default behavior, e.g. to show an alert dialog
      if (event.key === "Escape") {
        onEscapeKeydown();
      }
    },
    [onEscapeKeydown, onKeyDown]
  );

  return <Thread thread={thread} onKeyDown={handleKeyDown} {...threadProps} />;
}
