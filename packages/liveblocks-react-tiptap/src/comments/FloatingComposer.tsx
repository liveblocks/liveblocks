import { autoUpdate, flip, hide, limitShift, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import type { BaseMetadata } from "@liveblocks/client";
import type { DM } from "@liveblocks/core";
import { useCreateThread } from "@liveblocks/react";
import type { ComposerProps, ComposerSubmitComment } from "@liveblocks/react-ui";
import { Composer } from "@liveblocks/react-ui";
import { type Editor, useEditorState } from "@tiptap/react";
import type { ComponentRef, FormEvent, KeyboardEvent } from "react";
import React, { forwardRef, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

import type { CommentsExtensionStorage } from "../types";

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
  const { showComposer } = useEditorState({
    editor,
    selector: (ctx) => ({
      showComposer: !!(ctx.editor?.storage.liveblocksComments as CommentsExtensionStorage | undefined)?.pendingCommentSelection,
    }),
    equalityFn: (prev, next) => {
      if (!next) return false;
      return prev.showComposer === next.showComposer;
    },
  }) ?? { showComposer: false };

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


  const updateRef = useCallback(() => {
    if (!editor || !showComposer) {
      return;
    }
    const el = editor.view.dom.querySelector(".lb-tiptap-active-selection");
    if (el) {
      setReference(el);
    }
  }, [setReference, editor, showComposer]);

  // Remote cursor updates and other edits can cause the ref to break
  useEffect(() => {
    if (!editor || !showComposer) {
      return;
    }
    editor.on("transaction", updateRef)
    return () => {
      editor.off("transaction", updateRef);
    }
  }, [editor, updateRef, showComposer]);

  useLayoutEffect(updateRef, [updateRef]);


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

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape" && editor) {
      editor.commands.focus();
    }
    onKeyDown?.(event);
  }, [editor, onKeyDown]);


  if (!showComposer || !editor) {
    return null;
  }

  return createPortal(
    <div
      className="lb-root lb-portal lb-elevation lb-tiptap-floating lb-tiptap-floating-composer"
      ref={setFloating} style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}>
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