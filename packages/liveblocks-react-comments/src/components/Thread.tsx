"use client";

import type { ThreadData } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback, useMemo } from "react";

import { ResolveIcon } from "../icons/resolve";
import { ResolvedIcon } from "../icons/resolved";
import {
  type CommentOverrides,
  type ComposerOverrides,
  type ThreadOverrides,
  useOverrides,
} from "../overrides";
import { classNames } from "../utils/class-names";
import type { CommentProps } from "./Comment";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";

export interface ThreadProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The thread to display.
   */
  thread: ThreadData<{ resolved?: boolean }>;

  /**
   * Whether to show the composer to reply to the thread.
   */
  showComposer?: boolean;

  /**
   * Whether to show the action to resolve the thread.
   */
  showResolveAction?: boolean;

  /**
   * How to show or hide the actions.
   */
  showActions?: CommentProps["showActions"];

  /**
   * Whether to indent the comments' bodies.
   */
  indentCommentBody?: CommentProps["indentBody"];

  /**
   * Whether to show deleted comments.
   */
  showDeletedComments?: CommentProps["showDeleted"];

  /**
   * An event handler called when changing the resolved status.
   */
  onResolveChange?: (resolved: boolean) => void;

  /**
   * An event handler called when a comment is edited.
   */
  onCommentEdit?: CommentProps["onEdit"];

  /**
   * An event handler called when a comment is deleted.
   */
  onCommentDelete?: CommentProps["onDelete"];

  /**
   * An event handler called when clicking on a comment's author.
   */
  onAuthorClick?: CommentProps["onAuthorClick"];

  /**
   * An event handler called when clicking on a mention.
   */
  onMentionClick?: CommentProps["onMentionClick"];

  /**
   * Override the component's strings.
   */
  overrides?: Partial<ThreadOverrides & CommentOverrides & ComposerOverrides>;
}

/**
 * Displays a thread of comments, with a composer to reply
 * to it.
 *
 * @example
 * <>
 *   {threads.map((thread) => (
 *     <Thread key={thread.id} thread={thread} />
 *   ))}
 * </>
 */
export const Thread = forwardRef<HTMLDivElement, ThreadProps>(
  (
    {
      thread,
      indentCommentBody = true,
      showActions = "hover",
      showDeletedComments,
      showResolveAction = true,
      showComposer,
      onResolveChange,
      onCommentEdit,
      onCommentDelete,
      onAuthorClick,
      onMentionClick,
      overrides,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useEditThreadMetadata } = useRoomContextBundle();
    const editThreadMetadata = useEditThreadMetadata();
    const $ = useOverrides(overrides);
    const firstCommentIndex = useMemo(() => {
      return showDeletedComments
        ? 0
        : thread.comments.findIndex((comment) => comment.body);
    }, [showDeletedComments, thread.comments]);

    const handleResolvedChange = useCallback(
      (resolved: boolean) => {
        onResolveChange?.(resolved);

        editThreadMetadata({ threadId: thread.id, metadata: { resolved } });
      },
      [editThreadMetadata, onResolveChange, thread.id]
    );

    return (
      <TooltipProvider>
        <div
          className={classNames(
            "lb-root lb-thread",
            showActions === "hover" && "lb-thread:show-actions-hover",
            className
          )}
          data-resolved={thread.metadata.resolved ? "" : undefined}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
        >
          <div className="lb-thread-comments">
            {thread.comments.map((comment, index) => {
              const isFirstComment = index === firstCommentIndex;

              return (
                <Comment
                  key={comment.id}
                  className="lb-thread-comment"
                  comment={comment}
                  indentBody={indentCommentBody}
                  showDeleted={showDeletedComments}
                  showActions={showActions}
                  onEdit={onCommentEdit}
                  onDelete={onCommentDelete}
                  onAuthorClick={onAuthorClick}
                  onMentionClick={onMentionClick}
                  additionalActionsClassName={
                    isFirstComment ? "lb-thread-actions" : undefined
                  }
                  additionalActions={
                    isFirstComment && showResolveAction ? (
                      <Tooltip
                        content={
                          thread.metadata.resolved
                            ? $.THREAD_UNRESOLVE
                            : $.THREAD_RESOLVE
                        }
                      >
                        <TogglePrimitive.Root
                          className="lb-button lb-comment-action"
                          pressed={thread.metadata?.resolved}
                          onPressedChange={handleResolvedChange}
                          aria-label={
                            thread.metadata.resolved
                              ? $.THREAD_UNRESOLVE
                              : $.THREAD_RESOLVE
                          }
                        >
                          {thread.metadata.resolved ? (
                            <ResolvedIcon className="lb-button-icon" />
                          ) : (
                            <ResolveIcon className="lb-button-icon" />
                          )}
                        </TogglePrimitive.Root>
                      </Tooltip>
                    ) : null
                  }
                />
              );
            })}
          </div>
          {showComposer && (
            <Composer
              className="lb-thread-composer"
              threadId={thread.id}
              overrides={{
                COMPOSER_PLACEHOLDER: $.THREAD_COMPOSER_PLACEHOLDER,
                COMPOSER_SEND: $.THREAD_COMPOSER_SEND,
              }}
            />
          )}
        </div>
      </TooltipProvider>
    );
  }
);
