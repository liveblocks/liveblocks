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
  const { insertText } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const handleInsertMention = useCallback(() => {
    insertText(` ${MENTION_CHARACTER}`);
  }, [insertText]);

  return (
    <div className={classNames("lb-composer-menu", className)} {...props}>
      <div className="lb-composer-editor-actions">
        <Tooltip content="Mention someone">
          <button
            type="button"
            className="lb-button lb-composer-editor-action"
            aria-label="Insert mention"
            onMouseDown={preventDefault}
            onClick={handleInsertMention}
          >
            <MentionIcon />
          </button>
        </Tooltip>
      </div>
      <Logo className="lb-composer-logo" />
      <div className="lb-composer-actions">{actions}</div>
    </div>
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
          <ComposerMenu
            actions={
              <Tooltip content="Send">
                <ComposerPrimitive.Submit
                  className="lb-button lb-composer-action"
                  aria-label="Send"
                >
                  <SendIcon />
                </ComposerPrimitive.Submit>
              </Tooltip>
            }
          />
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
);
