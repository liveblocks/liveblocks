import { BaseMetadata } from "@liveblocks/client";
import { DM } from "@liveblocks/core";
import { useCreateThread } from "@liveblocks/react";
import { Composer, ComposerProps, ComposerSubmitComment } from "@liveblocks/react-ui";
import { Editor } from "@tiptap/react";
import React, { ComponentRef, FormEvent, forwardRef, useCallback, useEffect, useRef } from "react";
import { ACTIVE_SELECTOR_PLUGIN_KEY } from "./LiveblocksExtension";
import { autoUpdate, flip, hide, limitShift, offset, shift, size, useFloating } from "@floating-ui/react-dom";


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


  const showComposer = !!editor?.storage.liveblocksExtension.pendingCommentSelection;

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
      const currentDecorationNode = editor.view.dom.querySelector(
        '.lb-comment-active-selection',
      )
      if (currentDecorationNode) {
        setReference({
          getBoundingClientRect: () => currentDecorationNode.getBoundingClientRect(),
        });
      }
    }
    updateRect();
    editor.on('update', updateRect);
    return () => {
      editor.off('update', updateRect);
    }
  }, [editor, showComposer]);


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