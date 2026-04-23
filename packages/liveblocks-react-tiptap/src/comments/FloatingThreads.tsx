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
import {
  type BaseMetadata,
  type DCM,
  type DTM,
  shallow,
  type ThreadData,
} from "@liveblocks/core";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  Thread as DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import { cn, Portal, useStableComponent } from "@liveblocks/react-ui/_private";
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

import { THREADS_PLUGIN_KEY } from "../types";
import { compareDocumentPosition } from "../utils";

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
  const Thread = useStableComponent(components?.Thread, DefaultThread);

  const activeThreadIds =
    useEditorState({
      editor,
      selector: (ctx) => {
        if (!ctx?.editor?.state) {
          return undefined;
        }

        const state = THREADS_PLUGIN_KEY.getState(ctx.editor.state);

        return state?.activeThreadIds;
      },
      equalityFn: (prev, next) => {
        if (!prev || !next) return false;
        return shallow(prev, next);
      },
    }) ?? undefined;

  const [range, setRange] = useState<{
    range: Range;
    threads: ThreadData[];
  } | null>(null);

  const handleUpdateRange = useCallback(() => {
    if (
      !editor ||
      !editor.view ||
      editor.view.isDestroyed ||
      !activeThreadIds
    ) {
      setRange(null);
      return;
    }

    if (activeThreadIds.length === 0) {
      setRange(null);
      return;
    }

    const activeThreads = (threads ?? []).filter(
      (thread) => activeThreadIds.includes(thread.id) && !thread.resolved
    );
    if (activeThreads.length === 0) {
      setRange(null);
      return;
    }

    // A thread mark can be split across multiple DOM elements (e.g. when
    // overlapping with another mark), so we collect every matching element and
    // build a DOM range spanning from the first to the last one.
    const elements = new Set<HTMLElement>();
    for (const id of activeThreadIds) {
      const els = editor.view.dom.querySelectorAll<HTMLElement>(
        `span.lb-tiptap-thread-mark[data-lb-thread-id="${id}"]`
      );
      els.forEach((el) => elements.add(el));
    }

    const sorted = Array.from(elements).sort(compareDocumentPosition);
    if (sorted.length === 0) {
      setRange(null);
      return;
    }

    const domRange = document.createRange();
    domRange.setStartBefore(sorted[0]);
    domRange.setEndAfter(sorted[sorted.length - 1]);
    setRange({ range: domRange, threads: activeThreads });
  }, [editor, activeThreadIds, threads]);

  // Remote cursor updates and other edits can shift the underlying DOM
  // elements, so we recompute the range on every change.
  useEffect(() => {
    if (!editor) return;
    editor.on("transaction", handleUpdateRange);
    return () => {
      editor.off("transaction", handleUpdateRange);
    };
  }, [editor, handleUpdateRange]);

  useLayoutEffect(handleUpdateRange, [handleUpdateRange]);

  const handleEscapeKeydown = useCallback((): boolean => {
    if (!editor || range === null) return false;
    editor.commands.selectThread(null);
    return true;
  }, [editor, range]);

  if (range === null) {
    return null;
  }

  return (
    <FloatingThreadPortal range={range.range} {...props}>
      {range.threads.map((thread) => (
        <ThreadWrapper
          key={thread.id}
          thread={thread}
          Thread={Thread}
          onEscapeKeydown={handleEscapeKeydown}
          className="lb-tiptap-floating-threads-thread"
        />
      ))}
    </FloatingThreadPortal>
  );
}

interface FloatingThreadPortalProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  range: Range;
  children: ReactNode;
}

export const FLOATING_THREAD_COLLISION_PADDING = 10;

function FloatingThreadPortal({
  range,
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

  useLayoutEffect(() => {
    setReference({
      getBoundingClientRect: () => range.getBoundingClientRect(),
    });
  }, [setReference, range]);

  return (
    <Portal asChild>
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
      </div>
    </Portal>
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
