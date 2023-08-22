"use client";

import { useRoomContextBundle } from "@liveblocks/react";
import type {
  ComponentPropsWithoutRef,
  FormEvent,
  MouseEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback } from "react";

import { MentionIcon } from "../icons/mention";
import { SendIcon } from "../icons/send";
import { type ComposerOverrides, useOverrides } from "../overrides";
import * as ComposerPrimitive from "../primitives/Composer";
import { useComposer } from "../primitives/Composer/contexts";
import type {
  ComposerEditorProps,
  ComposerRenderMentionProps,
  ComposerRenderMentionSuggestionsProps,
  ComposerSubmitComment,
} from "../primitives/Composer/types";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import { classNames } from "../utils/class-names";
import { Avatar } from "./internal/Avatar";
import { Button } from "./internal/Button";
import { Logo } from "./internal/Logo";
import {
  Tooltip,
  TooltipProvider,
  TooltipShortcutKey,
} from "./internal/Tooltip";
import { User } from "./internal/User";

interface EditorActionProps extends ComponentPropsWithoutRef<"button"> {
  label: string;
}

type ComposerCreateThreadProps = {
  threadId?: never;
  commentId?: never;
};

type ComposerCreateCommentProps = {
  /**
   * The ID of the thread to reply to.
   */
  threadId: string;
  commentId?: never;
};

type ComposerEditCommentProps = {
  /**
   * The ID of the thread to edit a comment in.
   */
  threadId: string;

  /**
   * The ID of the comment to edit.
   */
  commentId: string;
};

export type ComposerProps = ComponentPropsWithoutRef<"form"> &
  (
    | ComposerCreateThreadProps
    | ComposerCreateCommentProps
    | ComposerEditCommentProps
  ) & {
    /**
     * The event handler called when the composer is submitted.
     */
    onComposerSubmit?: (
      comment: ComposerSubmitComment,
      event: FormEvent<HTMLFormElement>
    ) => Promise<void> | void;

    /**
     * The composer's initial value.
     */
    initialValue?: ComposerEditorProps["initialValue"];

    /**
     * Whether the composer is disabled.
     */
    disabled?: ComposerEditorProps["disabled"];

    /**
     * Whether to focus the composer on mount.
     */
    autoFocus?: ComposerEditorProps["autoFocus"];

    /**
     * Override the component's strings.
     */
    overrides?: Partial<ComposerOverrides>;

    /**
     * @internal
     */
    actions?: ReactNode;

    /**
     * @internal
     */
    showLogo?: boolean;
  };

function ComposerInsertMentionEditorAction({
  label,
  className,
  onClick,
  ...props
}: EditorActionProps) {
  const { createMention } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.isDefaultPrevented()) {
        event.stopPropagation();
        createMention();
      }
    },
    [createMention, onClick]
  );

  return (
    <Tooltip content={label}>
      <Button
        type="button"
        className={classNames("lb-composer-editor-action", className)}
        onMouseDown={preventDefault}
        onClick={handleClick}
        aria-label={label}
        {...props}
      >
        <MentionIcon className="lb-button-icon" />
      </Button>
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
    <ComposerPrimitive.Suggestions className="lb-root lb-elevation lb-composer-suggestions lb-composer-mention-suggestions">
      <ComposerPrimitive.SuggestionsList className="lb-composer-suggestions-list lb-composer-mention-suggestions-list">
        {userIds.map((userId) => (
          <ComposerPrimitive.SuggestionsListItem
            key={userId}
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

/**
 * Displays a composer to create comments.
 *
 * @example
 * <Composer />
 */
export const Composer = forwardRef<HTMLFormElement, ComposerProps>(
  (
    {
      threadId,
      commentId,
      onComposerSubmit,
      initialValue,
      disabled,
      autoFocus,
      overrides,
      actions,
      showLogo,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useCreateThread, useCreateComment, useEditComment } =
      useRoomContextBundle();
    const createThread = useCreateThread();
    const createComment = useCreateComment();
    const editComment = useEditComment();
    const $ = useOverrides(overrides);

    const preventDefault = useCallback((event: SyntheticEvent) => {
      event.preventDefault();
    }, []);

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const handleCommentSubmit = useCallback(
      (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
        onComposerSubmit?.(comment, event);

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
        onComposerSubmit,
        threadId,
      ]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form
          className={classNames(
            "lb-root lb-composer lb-composer-form",
            className
          )}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
          onComposerSubmit={handleCommentSubmit}
        >
          <ComposerPrimitive.Editor
            className="lb-composer-editor"
            onClick={stopPropagation}
            placeholder={$.COMPOSER_PLACEHOLDER}
            initialValue={initialValue}
            disabled={disabled}
            autoFocus={autoFocus}
            renderMention={ComposerMention}
            renderMentionSuggestions={ComposerMentionSuggestions}
            dir={$.dir}
          />
          <div className="lb-composer-footer">
            <div className="lb-composer-editor-actions">
              <ComposerInsertMentionEditorAction
                label={$.COMPOSER_INSERT_MENTION}
              />
            </div>
            {showLogo && <Logo className="lb-composer-logo" />}
            <div className="lb-composer-actions">
              {actions ?? (
                <>
                  <Tooltip
                    content={$.COMPOSER_SEND}
                    shortcut={<TooltipShortcutKey name="enter" />}
                  >
                    <ComposerPrimitive.Submit asChild>
                      <Button
                        disabled={disabled}
                        onMouseDown={preventDefault}
                        onClick={stopPropagation}
                        className="lb-composer-action"
                        variant="primary"
                        aria-label={$.COMPOSER_SEND}
                      >
                        <SendIcon />
                      </Button>
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
