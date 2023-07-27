"use client";

import type { CommentBody } from "@liveblocks/core";
import type {
  ComponentProps,
  FormEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback } from "react";

import { useCommentsContext } from "../factory";
import { MentionIcon } from "../icons/mention";
import { SendIcon } from "../icons/send";
import type {
  ComposerEditorProps,
  ComposerFormProps,
  ComposerRenderMentionProps,
  ComposerSubmitComment,
} from "../primitives/Composer";
import {
  Composer as ComposerPrimitive,
  useComposer,
} from "../primitives/Composer";
import { MENTION_CHARACTER } from "../slate/mentions";
import type { SlotProp } from "../types";
import { classNames } from "../utils/class-names";
import { Logo } from "./Logo";
import { Tooltip, TooltipProvider } from "./Tooltip";
import { User } from "./User";

type ComposerCreateThreadProps = {
  /**
   * TODO: JSDoc
   */
  threadId?: never;

  /**
   * TODO: JSDoc
   */
  commentId?: never;

  /**
   * TODO: JSDoc
   */
  body?: never;
};

type ComposerCreateCommentProps = {
  /**
   * TODO: JSDoc
   */
  threadId: string;

  /**
   * TODO: JSDoc
   */
  commentId?: never;

  /**
   * TODO: JSDoc
   */
  body?: never;
};

type ComposerEditCommentProps = {
  /**
   * TODO: JSDoc
   */
  threadId: string;

  /**
   * TODO: JSDoc
   */
  commentId: string;

  /**
   * TODO: JSDoc
   */
  body: CommentBody;
};

export type ComposerProps = Omit<ComposerFormProps, keyof SlotProp> &
  Pick<ComposerEditorProps, "initialValue" | "disabled" | "autoFocus"> &
  (
    | ComposerCreateThreadProps
    | ComposerCreateCommentProps
    | ComposerEditCommentProps
  ) & {
    /**
     * @internal
     *
     * This is a private API and should not be used.
     */
    actions?: ReactNode;
  };

function ComposerInsertMentionAction({
  className,
  ...props
}: ComponentProps<"button">) {
  const { insertText } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const handleInsertMention = useCallback(() => {
    insertText(` ${MENTION_CHARACTER}`);
  }, [insertText]);

  return (
    <Tooltip content="Mention someone">
      <button
        type="button"
        className={classNames("lb-button lb-composer-editor-action", className)}
        onMouseDown={preventDefault}
        onClick={handleInsertMention}
        aria-label="Mention someone"
        {...props}
      >
        <MentionIcon className="lb-button-icon" />
      </button>
    </Tooltip>
  );
}

function ComposerMention({ userId }: ComposerRenderMentionProps) {
  return (
    <ComposerPrimitive.Mention className="lb-composer-mention">
      {MENTION_CHARACTER}
      <User userId={userId} />
    </ComposerPrimitive.Mention>
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
      actions,
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

    const preventDefault = useCallback((event: SyntheticEvent) => {
      event.preventDefault();
    }, []);

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
      <TooltipProvider>
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
            renderMention={ComposerMention}
            // renderMentionSuggestions={}
          />
          <div className="lb-composer-footer">
            <div className="lb-composer-editor-actions">
              <ComposerInsertMentionAction />
            </div>
            <Logo className="lb-composer-logo" />
            <div className="lb-composer-actions">
              {actions ?? (
                <>
                  <Tooltip content="Send">
                    <ComposerPrimitive.Submit
                      onMouseDown={preventDefault}
                      className="lb-button lb-button:primary lb-composer-action"
                      aria-label="Send"
                    >
                      <SendIcon />
                    </ComposerPrimitive.Submit>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
);
