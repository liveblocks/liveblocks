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
  ComposerRenderMentionSuggestionsProps,
  ComposerSubmitComment,
} from "../primitives/Composer";
import {
  Composer as ComposerPrimitive,
  useComposer,
} from "../primitives/Composer";
import { MENTION_CHARACTER } from "../slate/mentions";
import type { SlotProp } from "../types";
import { classNames } from "../utils/class-names";
import { Avatar } from "./Avatar";
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

    /**
     * @internal
     *
     * This is a private API and should not be used.
     */
    showLogo?: boolean;
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

function ComposerMentionSuggestions({
  userIds,
}: ComposerRenderMentionSuggestionsProps) {
  return userIds.length > 0 ? (
    <ComposerPrimitive.Suggestions className="lb-elevation lb-composer-suggestions lb-composer-mention-suggestions">
      <ComposerPrimitive.SuggestionsList className="lb-composer-suggestions-list lb-composer-mention-suggestions-list">
        {userIds.map((userId) => (
          <ComposerPrimitive.SuggestionsListItem
            className="lb-composer-suggestions-list-item lb-composer-mention-suggestion"
            value={userId}
          >
            <Avatar
              userId={userId}
              className="lb-composer-mention-suggestion-avatar"
            />
            <User
              userId={userId}
              className="lb-composer-mention-suggestion-user"
            />
          </ComposerPrimitive.SuggestionsListItem>
        ))}
      </ComposerPrimitive.SuggestionsList>
    </ComposerPrimitive.Suggestions>
  ) : null;
}

export const Composer = forwardRef<HTMLFormElement, ComposerProps>(
  (
    {
      threadId,
      commentId,
      onCommentSubmit,
      initialValue,
      disabled,
      autoFocus,
      actions,
      showLogo = true,
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
            placeholder="Write a comment…"
            initialValue={initialValue}
            disabled={disabled}
            autoFocus={autoFocus}
            renderMention={ComposerMention}
            renderMentionSuggestions={ComposerMentionSuggestions}
          />
          <div className="lb-composer-footer">
            <div className="lb-composer-editor-actions">
              <ComposerInsertMentionAction />
            </div>
            {showLogo && <Logo className="lb-composer-logo" />}
            <div className="lb-composer-actions">
              {actions ?? (
                <>
                  <Tooltip content="Send comment" shortcut={<kbd>↵</kbd>}>
                    <ComposerPrimitive.Submit
                      onMouseDown={preventDefault}
                      className="lb-button lb-button:primary lb-composer-action"
                      aria-label="Send comment"
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
