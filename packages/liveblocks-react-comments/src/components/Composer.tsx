import type { CommentBody } from "@liveblocks/core";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import React, { forwardRef, useCallback } from "react";

import { useCommentsContext } from "../factory";
import { MentionIcon } from "../icons/mention";
import { SendIcon } from "../icons/send";
import type {
  ComposerEditorProps,
  ComposerFormProps,
  ComposerSubmitComment,
} from "../primitives/Composer";
import { Composer as ComposerPrimitive } from "../primitives/Composer";
import type { SlotProp } from "../types";
import { classNames } from "../utils/class-names";
import { Logo } from "./Logo";

interface ComposerMenuProps extends ComponentProps<"div"> {
  actions: ReactNode;
}

type ComposerCreateThreadProps = {
  threadId?: never;
  commentId?: never;
  body?: never;
};

type ComposerCreateCommentProps = {
  threadId: string;
  commentId?: never;
  body?: never;
};

type ComposerEditCommentProps = {
  threadId: string;
  commentId: string;
  body: CommentBody;
};

export type ComposerProps = Omit<ComposerFormProps, keyof SlotProp> &
  Pick<ComposerEditorProps, "initialValue" | "disabled"> &
  (
    | ComposerCreateThreadProps
    | ComposerCreateCommentProps
    | ComposerEditCommentProps
  );

export function ComposerMenu({
  actions,
  className,
  ...props
}: ComposerMenuProps) {
  return (
    <div className={classNames("lb-composer-menu", className)} {...props}>
      <div className="lb-composer-editor-actions">
        <button
          className="lb-button lb-composer-editor-action"
          aria-label="Insert mention"
        >
          <MentionIcon />
        </button>
      </div>
      <Logo className="lb-composer-logo" />
      <div className="lb-composer-actions">{actions}</div>
    </div>
  );
}

export const Composer = forwardRef<HTMLFormElement, ComposerProps>(
  (
    {
      threadId,
      commentId,
      onCommentSubmit,
      initialValue,
      disabled,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useCreateThread, useCreateComment, useEditComment } =
      useCommentsContext();
    const createThread = useCreateThread();
    const createComment = useCreateComment();
    const editComment = useEditComment();

    const handleCommentSubmit = useCallback(
      (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
        onCommentSubmit?.(comment, event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (commentId && threadId) {
          editComment({
            commentId,
            threadId,
            body: comment.body,
          });
        } else if (threadId) {
          createComment({
            threadId,
            body: comment.body,
          });
        } else {
          createThread({
            body: comment.body,
            metadata: {},
          });
        }
      },
      [
        commentId,
        createComment,
        createThread,
        editComment,
        onCommentSubmit,
        threadId,
      ]
    );

    return (
      <ComposerPrimitive.Form
        className={classNames("lb-composer lb-composer-form", className)}
        {...props}
        ref={forwardedRef}
        onCommentSubmit={handleCommentSubmit}
      >
        <ComposerPrimitive.Editor
          className="lb-composer-editor"
          initialValue={initialValue}
          placeholder="Write a comment…"
          disabled={disabled}
        />
        <ComposerMenu
          actions={
            <ComposerPrimitive.Submit
              className="lb-button lb-composer-action"
              aria-label="Send"
            >
              <SendIcon />
            </ComposerPrimitive.Submit>
          }
        />
      </ComposerPrimitive.Form>
    );
  }
);
