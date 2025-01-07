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
import type { BaseMetadata, DM } from "@liveblocks/core";
import { useCreateThread } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import type {
  ComposerProps,
  ComposerSubmitComment,
} from "@liveblocks/react-ui";
import { Composer } from "@liveblocks/react-ui";
import type { LexicalCommand } from "lexical";
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from "lexical";
import type { ComponentRef, FormEvent, KeyboardEvent, ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { createDOMRange } from "../create-dom-range";
import { createRectsFromDOMRange } from "../create-rects-from-dom-range";
import $wrapSelectionInThreadMarkNode from "./wrap-selection-in-thread-mark-node";

/**
 * Dispatching OPEN_FLOATING_COMPOSER_COMMAND will display the FloatingComposer
 *
 * @example
 * import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
 * import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
 *
 * function Toolbar() {
 *   const [editor] = useLexicalComposerContext();
 *
 *   return (
 *     <button
 *       onClick={() => {
 *         editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND);
 *       }}
 *     >
 *       💬 New comment
 *     </button>
 *   );
 * }
 */
export const OPEN_FLOATING_COMPOSER_COMMAND: LexicalCommand<void> =
  createCommand("OPEN_FLOATING_COMPOSER_COMMAND");

type ComposerElement = ComponentRef<typeof Composer>;

export type FloatingComposerProps<M extends BaseMetadata = DM> = Omit<
  ComposerProps<M>,
  "threadId" | "commentId"
>;

/**
 * Displays a `Composer` near the current lexical selection.
 *
 * To open it, dispatch `OPEN_FLOATING_COMPOSER_COMMAND`.
 *
 * Submitting a comment will attach an annotation thread at the current selection.
 * Should be nested inside `LiveblocksPlugin`.
 */
export const FloatingComposer = forwardRef<
  ComposerElement,
  FloatingComposerProps
>(function FloatingComposer(props, forwardedRef) {
  const [range, setRange] = useState<Range | null>(null);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      OPEN_FLOATING_COMPOSER_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        if (selection.isCollapsed()) return false;

        const { anchor, focus } = selection;

        const range = createDOMRange(
          editor,
          anchor.getNode(),
          anchor.offset,
          focus.getNode(),
          focus.offset
        );

        setRange(range);

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  if (range === null) return null;

  return (
    <FloatingComposerImpl
      ref={forwardedRef}
      {...props}
      range={range}
      onRangeChange={setRange}
    />
  );
});

interface FloatingComposerImplProps extends FloatingComposerProps {
  range: Range;
  onRangeChange: (range: Range | null) => void;
}

const FloatingComposerImpl = forwardRef<
  ComposerElement,
  FloatingComposerImplProps
>(function FloatingComposer(props, forwardedRef) {
  const {
    range,
    onRangeChange,
    onKeyDown,
    onComposerSubmit,
    ...composerProps
  } = props;

  const [editor] = useLexicalComposerContext();
  const createThread = useCreateThread();

  const $onStateRead = useCallback((): Range | null => {
    const selection = $getSelection();

    // If the selection is not a range selection or is collapsed, clear the range so the composer is no longer displayed.
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      return null;
    }

    const { anchor, focus } = selection;
    const range = createDOMRange(
      editor,
      anchor.getNode(),
      anchor.offset,
      focus.getNode(),
      focus.offset
    );

    return range;
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // If the update is not related to collaboration, clear the range so the composer is no longer displayed.
      if (!tags.has("collaboration")) {
        onRangeChange(null);
        return;
      }

      const range = state.read(() => $onStateRead());
      onRangeChange(range);
    });
  }, [editor, range, onRangeChange, $onStateRead]);

  /**
   * Create a new ThreadMarkNode and wrap the selected content in it.
   * @param threadId The id of the thread to associate with the selected content
   */
  const onThreadCreate = useCallback(
    (threadId: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        // If the selection is collapsed, we do not create a new thread node in the editor.
        if (selection.isCollapsed()) return;

        const isBackward = selection.isBackward();
        // Wrap content in a ThreadMarkNode
        $wrapSelectionInThreadMarkNode(selection, isBackward, threadId);

        // Clear the selection after wrapping
        $setSelection(null);
      });
    },
    [editor]
  );

  const handleComposerSubmit = useCallback(
    (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      onComposerSubmit?.(comment, event);
      if (event.defaultPrevented) return;

      event.preventDefault();

      const thread = createThread({
        body: comment.body,
        attachments: comment.attachments,
        metadata: props.metadata ?? {},
      });

      onThreadCreate(thread.id);
    },
    [onThreadCreate, onComposerSubmit, props.metadata, createThread]
  );

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      onRangeChange(null);
      editor.focus();
    }
    onKeyDown?.(event);
  }

  return (
    <>
      <ActiveSelectionPortal range={range} container={document.body} />

      <FloatingComposerPortal range={range} container={document.body}>
        <Composer
          autoFocus
          {...composerProps}
          onKeyDown={handleKeyDown}
          onComposerSubmit={handleComposerSubmit}
          ref={forwardedRef}
        />
      </FloatingComposerPortal>
    </>
  );
});

function ActiveSelectionPortal({
  range,
  container,
}: {
  range: Range;
  container: HTMLElement;
}) {
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "bottom",
    middleware: [offset(-range.getBoundingClientRect().height)],
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

  const [editor] = useLexicalComposerContext();
  const rects = createRectsFromDOMRange(editor, range);

  return createPortal(
    <>
      <span
        ref={setFloating}
        style={{
          position: strategy,
          top: 0,
          left: 0,
          transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
          minWidth: "max-content",
          width: range.getBoundingClientRect().width,
          height: range.getBoundingClientRect().height,
          pointerEvents: "none",
        }}
        className="lb-root lb-portal"
      >
        {rects.map((rect) => (
          <span
            key={JSON.stringify(rect)}
            style={{
              position: "absolute",
              top: rect.top - range.getBoundingClientRect().top,
              left: rect.left - range.getBoundingClientRect().left,
              width: rect.width,
              height: rect.height,
              backgroundColor: "var(--lb-selection, rgba(0, 0, 255, 0.2))",
              pointerEvents: "none",
            }}
            className="lb-lexical-active-selection"
          />
        ))}
      </span>
    </>,
    container
  );
}

export const FLOATING_COMPOSER_COLLISION_PADDING = 10;

function FloatingComposerPortal({
  container,
  range,
  children,
}: {
  container: HTMLElement;
  range: Range;
  children: ReactNode;
}) {
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "bottom",
    middleware: [
      flip({ padding: FLOATING_COMPOSER_COLLISION_PADDING, crossAxis: false }),
      offset(10),
      hide({ padding: FLOATING_COMPOSER_COLLISION_PADDING }),
      shift({
        padding: FLOATING_COMPOSER_COLLISION_PADDING,
        limiter: limitShift(),
      }),
      size({ padding: FLOATING_COMPOSER_COLLISION_PADDING }),
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
  }, [range, setReference]);

  return createPortal(
    <div
      ref={setFloating}
      style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}
      className="lb-root lb-portal lb-elevation lb-lexical-floating lb-lexical-floating-composer"
    >
      {children}
    </div>,
    container
  );
}
