import {
  autoUpdate,
  flip,
  hide,
  inline,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import type { BaseMetadata } from "@liveblocks/client";
import type { DCM, DTM } from "@liveblocks/core";
import { useCreateThread } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import type {
  ComposerProps,
  ComposerSubmitComment,
} from "@liveblocks/react-ui";
import { Composer as DefaultComposer } from "@liveblocks/react-ui";
import { type Editor, useEditorState } from "@tiptap/react";
import type {
  ComponentType,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
} from "react";
import { forwardRef, useCallback } from "react";
import { createPortal } from "react-dom";

import type { ExtendedChainedCommands } from "../types";
import { compareSelections, getDomRangeFromSelection } from "../utils";

type ExcludeProps<T, K extends Record<string, unknown>> = Omit<
  Exclude<T, T & K>,
  keyof K
>;

type ComposerPropsCreateThread<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
> = ExcludeProps<
  ComposerProps<TM, CM>,
  { threadId: string; commentId: string }
>;

type FloatingComposerComponents = {
  Composer: ComponentType<ComposerPropsCreateThread<DTM, DCM>>;
};

export type FloatingComposerProps<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> = ComposerPropsCreateThread<TM, CM> & {
  /**
   * Override the component's components.
   */
  components?: Partial<FloatingComposerComponents>;

  /**
   * The Tiptap editor.
   */
  editor: Editor | null;
};

export const FLOATING_COMPOSER_COLLISION_PADDING = 10;

export const FloatingComposer = forwardRef<
  HTMLFormElement,
  FloatingComposerProps
>(function FloatingComposer(
  { editor, onComposerSubmit, onKeyDown, onClick, components, ...props },
  forwardedRef
) {
  const Composer = components?.Composer ?? DefaultComposer;
  const createThread = useCreateThread();
  const pendingCommentSelection =
    useEditorState({
      editor,
      selector: (ctx) => {
        if (!ctx.editor) {
          return undefined;
        }

        const hasPendingComment =
          ctx.editor.storage.liveblocksComments.pendingComment;
        const isEmpty = ctx.editor.state.selection.empty;

        return hasPendingComment && !isEmpty
          ? ctx.editor.state.selection
          : undefined;
      },
      equalityFn: compareSelections,
    }) ?? undefined;
  const isOpen = pendingCommentSelection !== undefined;
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "bottom",
    middleware: [
      inline({ padding: FLOATING_COMPOSER_COLLISION_PADDING }),
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
    if (!editor || !isOpen) {
      return;
    }

    if (!pendingCommentSelection) {
      setReference(null);
    } else {
      const domRange = getDomRangeFromSelection(
        editor,
        pendingCommentSelection
      );

      setReference(domRange);
    }
  }, [pendingCommentSelection, editor, isOpen, setReference]);

  // Submit a new thread and update the comment highlight to show a completed highlight
  const handleComposerSubmit = useCallback(
    (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      onComposerSubmit?.(comment, event);
      if (event.defaultPrevented) return;

      if (!editor) {
        return;
      }

      event.preventDefault();

      const thread = createThread({
        body: comment.body,
        attachments: comment.attachments,
        metadata: props.metadata ?? {},
      });
      editor.commands.addComment(thread.id);
    },
    [onComposerSubmit, editor, createThread, props.metadata]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLFormElement>) => {
      onKeyDown?.(event);

      if (event.isDefaultPrevented() || !editor) {
        return;
      }

      if (event.key === "Escape") {
        (editor.chain() as ExtendedChainedCommands<"closePendingComment">)
          .closePendingComment()
          .run();
      }
    },
    [editor, onKeyDown]
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLFormElement>) => {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      // Don't send up a click event from emoji picker and close the composer.
      event.stopPropagation();
    },
    [onClick]
  );

  if (!isOpen || !editor) {
    return null;
  }

  return createPortal(
    <div
      className="lb-root lb-portal lb-elevation lb-tiptap-floating lb-tiptap-floating-composer"
      ref={setFloating}
      style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}
    >
      <Composer
        ref={forwardedRef}
        autoFocus
        {...props}
        onKeyDown={handleKeyDown}
        onComposerSubmit={handleComposerSubmit}
        onClick={handleClick}
      />
    </div>,
    document.body
  );
});
