import {
  autoUpdate,
  ClientRectObject,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import type { BaseMetadata, DM, ThreadData } from "@liveblocks/core";
import {
  Thread as DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import React, {
  type ComponentType,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/react";

import { classNames } from "./classnames";
import { ThreadPluginActions, ThreadPluginState, THREADS_PLUGIN_KEY } from "./LiveblocksExtension";
import { getRectFromCoords } from "./utils";

type ThreadPanelComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface FloatingThreadsProps<M extends BaseMetadata = DM>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The threads to display.
   */
  threads: ThreadData<M>[];

  /**
   * Override the component's components.
   */
  components?: Partial<ThreadPanelComponents>;

  /**
   * The tiptap editor
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
  const pluginState = editor ? THREADS_PLUGIN_KEY.getState(editor.state) as ThreadPluginState : null;

  const [activeThreads, setActiveThreads] = useState<{
    rect: ClientRectObject;
    threads: ThreadData[];
  } | null>(null);


  useEffect(() => {
    if (!editor || !pluginState) {
      setActiveThreads(null);
      return;
    }
    const { selectedThreadId, selectedThreadPos } = pluginState;
    if (selectedThreadId === null || selectedThreadPos === null) {
      setActiveThreads(null);
      return;
    }
    const coords = editor.view.coordsAtPos(Math.min(selectedThreadPos, editor.state.doc.content.size - 1));
    const active = (threads ?? []).filter((thread) =>
      selectedThreadId === thread.id
    );
    setActiveThreads({
      rect: getRectFromCoords(coords), threads: active
    });
  }, [pluginState, threads]);

  const handleEscapeKeydown = useCallback((): boolean => {
    if (!editor || activeThreads === null) return false;
    editor.view.dispatch(editor.state.tr.setMeta(THREADS_PLUGIN_KEY, {
      name: ThreadPluginActions.SET_SELECTED_THREAD_ID,
      data: null,
    }));
    return true;
  }, [activeThreads]);

  if (!activeThreads) return null;

  return (
    <FloatingThreadPortal
      rect={activeThreads.rect}
      container={document.body}
      {...props}
    >
      {activeThreads.threads.map((thread) => (
        <ThreadWrapper
          key={thread.id}
          thread={thread}
          Thread={Thread}
          onEscapeKeydown={handleEscapeKeydown}
          className="lb-lexical-floating-threads-thread"
        />
      ))}
    </FloatingThreadPortal>
  );
}

interface FloatingThreadPortalProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  rect: ClientRectObject;
  container: HTMLElement;
  children: ReactNode;
}

export const FLOATING_THREAD_COLLISION_PADDING = 10;

function FloatingThreadPortal({
  container,
  rect,
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
            "--lb-lexical-floating-threads-available-width",
            `${availableWidth}px`
          );
          elements.floating.style.setProperty(
            "--lb-lexical-floating-threads-available-height",
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

  useLayoutEffect(() => {
    setReference({
      getBoundingClientRect: () => rect,
    });
  }, [setReference, rect]);

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
      className={classNames(
        "lb-root lb-portal lb-elevation lb-lexical-floating lb-lexical-floating-threads",
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

