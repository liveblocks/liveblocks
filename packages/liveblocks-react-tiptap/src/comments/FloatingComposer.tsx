import { autoUpdate, flip, hide, limitShift, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import type { BaseMetadata } from "@liveblocks/client";
import type { DM } from "@liveblocks/core";
import { useCreateThread } from "@liveblocks/react";
import type { ComposerProps, ComposerSubmitComment } from "@liveblocks/react-ui";
import { Composer } from "@liveblocks/react-ui";
import type { Editor } from "@tiptap/react";
import type { ComponentRef, FormEvent } from "react";
import React, { forwardRef, useCallback, useEffect } from "react";

import type { CommentsExtensionStorage } from "../types";
import { getRectFromCoords } from "../utils";

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
  const { editor } = props;

  const storage = editor?.storage.liveblocksComments as CommentsExtensionStorage | undefined;

  const showComposer = !!storage?.pendingCommentSelection;

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

  useEffect(() => {
    if (!editor || !showComposer) {
      return;
    }
    const updateRect = () => {
      if (!storage) {
        return;
      }
      const seclection = storage.pendingCommentSelection;
      if (!seclection) {
        return;
      }
      const coords = editor.view.coordsAtPos(Math.min(seclection.from, editor.state.doc.content.size - 1));
      if (coords) {
        setReference({
          getBoundingClientRect: () => getRectFromCoords(coords)
        });
      }
    }
    updateRect();
    editor.on("update", updateRect);
    return () => {
      editor.off("update", updateRect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, setReference, showComposer]); // don't need storage explicitly here


  // Submit a new thread and update the comment highlight to show a completed highlight
  const handleComposerSubmit = useCallback(
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      if (!editor) {
        return;
      }
      event.preventDefault();

      const thread = createThread({
        body,
      });
      editor.commands.addComment(thread.id);

    },
    [editor, createThread]
  );

  if (!showComposer || !editor) {
    return null;
  }

  return (
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
        onComposerSubmit={handleComposerSubmit}
        onClick={(e) => {
          // Don't send up a click event from emoji popout and close the composer
          e.stopPropagation();
        }}
        autoFocus={true}
      />
    </div>
  );
});