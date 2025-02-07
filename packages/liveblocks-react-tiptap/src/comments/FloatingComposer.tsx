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
import type { DM } from "@liveblocks/core";
import { useCreateThread } from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import type {
  ComposerProps,
  ComposerSubmitComment,
} from "@liveblocks/react-ui";
import { Composer } from "@liveblocks/react-ui";
import { type Editor, useEditorState } from "@tiptap/react";
import type { ComponentRef, FormEvent, KeyboardEvent } from "react";
import { forwardRef, useCallback } from "react";
import { createPortal } from "react-dom";

import type {
  CommentsExtensionStorage,
  ExtendedChainedCommands,
} from "../types";
import { compareSelections, getDomRangeFromSelection } from "../utils";

export type FloatingComposerProps<M extends BaseMetadata = DM> = Omit<
  ComposerProps<M>,
  "threadId" | "commentId"
> & {
  editor: Editor | null;
};

type ComposerElement = ComponentRef<typeof Composer>;

export const FLOATING_COMPOSER_COLLISION_PADDING = 10;

export const FloatingComposer = forwardRef<
  ComposerElement,
  FloatingComposerProps
>(function FloatingComposer(props, forwardedRef) {
  const createThread = useCreateThread();
  const { editor, onComposerSubmit, onKeyDown } = props;
  const pendingCommentSelection =
    useEditorState({
      editor,
      selector: (ctx) => {
        if (!ctx.editor) return;

        return (
          ctx.editor.storage.liveblocksComments as
            | CommentsExtensionStorage
            | undefined
        )?.pendingComment && !ctx.editor.state.selection.empty
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
        {...props}
        onKeyDown={handleKeyDown}
        onComposerSubmit={handleComposerSubmit}
        onClick={(e) => {
          // Don't send up a click event from emoji popout and close the composer
          e.stopPropagation();
        }}
        autoFocus={true}
      />
    </div>,
    document.body
  );
});
