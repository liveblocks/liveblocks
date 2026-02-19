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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata, ThreadData } from "@liveblocks/client";
import type { DCM, DTM } from "@liveblocks/core";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  Thread as DefaultThread,
  type ThreadProps,
} from "@liveblocks/react-ui";
import { cn, Portal } from "@liveblocks/react-ui/_private";
import {
  $getSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import {
  type ComponentType,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { compareNodes } from "./anchored-threads";
import {
  ActiveThreadsContext,
  type ThreadToNodesMap,
} from "./comment-plugin-provider";
import { ThreadToNodesContext } from "./comment-plugin-provider";

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
}

export function FloatingThreads({
  threads,
  components,
  ...props
}: FloatingThreadsProps) {
  const activeThreads = useActiveThreads();

  const Thread = components?.Thread ?? DefaultThread;

  const [editor] = useLexicalComposerContext();
  const nodes = useThreadToNodes(); // A map of thread ids to a set of thread mark nodes associated with the thread

  const [range, setRange] = useState<{
    range: Range;
    threads: ThreadData[];
  } | null>(null);

  const handleUpdateRange = useCallback(() => {
    function getActiveRange(): Range | null {
      function getActiveElements() {
        const activeElements = new Set<HTMLElement>();

        for (const thread of activeThreads) {
          const keys = nodes.get(thread);
          if (keys === undefined) continue;

          for (const key of keys) {
            const element = editor.getElementByKey(key);
            if (element === null) continue;
            activeElements.add(element);
          }
        }
        return activeElements;
      }

      const activeElements = getActiveElements();

      const sortedElements = Array.from(activeElements).sort(compareNodes);
      if (sortedElements.length === 0) return null;

      const range = document.createRange();
      range.setStartBefore(sortedElements[0]);
      range.setEndAfter(sortedElements[sortedElements.length - 1]);

      return range;
    }

    const active = (threads ?? []).filter((thread) =>
      activeThreads.includes(thread.id)
    );

    const range = getActiveRange();
    if (range === null) {
      setRange(null);
      return;
    }

    setRange({ range, threads: active });
  }, [activeThreads, nodes, editor, threads]);

  useEffect(() => {
    handleUpdateRange();
  }, [handleUpdateRange]);

  useEffect(() => {
    return editor.registerUpdateListener(handleUpdateRange);
  }, [editor, handleUpdateRange]);

  const handleEscapeKeydown = useCallback((): boolean => {
    if (range === null) return false;
    setRange(null);
    return true;
  }, [range]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      handleEscapeKeydown,
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, handleEscapeKeydown]);

  const isCollapsed = useIsSelectionCollapsed();

  if (range === null || isCollapsed === null || !isCollapsed) return null;

  return (
    <FloatingThreadPortal range={range.range} {...props}>
      {range.threads.map((thread) => (
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
          "lb-root lb-portal lb-elevation lb-lexical-floating lb-lexical-floating-threads",
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

function useThreadToNodes(): ThreadToNodesMap {
  const threadToNodes = useContext(ThreadToNodesContext);
  if (threadToNodes === null) {
    throw new Error(
      "FloatingThreads component must be used within a LiveblocksPlugin component."
    );
  }
  return threadToNodes;
}

function useIsSelectionCollapsed(): boolean | null {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerUpdateListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (selection === null) return null;
      return selection.isCollapsed();
    });
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function useActiveThreads() {
  const activeThreads = useContext(ActiveThreadsContext);
  if (activeThreads === null) {
    throw new Error(
      "FloatingThreads component must be used within LiveblocksPlugin."
    );
  }

  return activeThreads;
}
