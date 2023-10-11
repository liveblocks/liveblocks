"use client";

import type { BaseMetadata, CommentData, ThreadData } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type {
  ComponentPropsWithoutRef,
  ForwardedRef,
  RefAttributes,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback, useMemo } from "react";

import { ResolveIcon } from "../icons/Resolve";
import { ResolvedIcon } from "../icons/Resolved";
import {
  type CommentOverrides,
  type ComposerOverrides,
  type ThreadOverrides,
  useOverrides,
} from "../overrides";
import type { ThreadMetadata } from "../types";
import { classNames } from "../utils/class-names";
import type { CommentProps } from "./Comment";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import { Button } from "./internal/Button";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";

export interface ThreadProps<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
> extends ComponentPropsWithoutRef<"div"> {
  /**
   * The thread to display.
   */
  thread: ThreadData<TThreadMetadata>;

  /**
   * How to show or hide the composer to reply to the thread.
   */
  showComposer?: boolean | "collapsed";

  /**
   * Whether to show the action to resolve the thread.
   */
  showResolveAction?: boolean;

  /**
   * How to show or hide the actions.
   */
  showActions?: CommentProps["showActions"];

  /**
   * Whether to show reactions.
   */
  showReactions?: CommentProps["showReactions"];

  /**
   * Whether to indent the comments' content.
   */
  indentCommentContent?: CommentProps["indentContent"];

  /**
   * Whether to show deleted comments.
   */
  showDeletedComments?: CommentProps["showDeleted"];

  /**
   * The event handler called when changing the resolved status.
   */
  onResolvedChange?: (resolved: boolean) => void;

  /**
   * The event handler called when a comment is edited.
   */
  onCommentEdit?: CommentProps["onCommentEdit"];

  /**
   * The event handler called when a comment is deleted.
   */
  onCommentDelete?: CommentProps["onCommentDelete"];

  /**
   * The event handler called when a comment is deleted.
   */
  onThreadDelete?: (thread: ThreadData<TThreadMetadata>) => void;

  /**
   * The event handler called when clicking on a comment's author.
   */
  onAuthorClick?: CommentProps["onAuthorClick"];

  /**
   * The event handler called when clicking on a mention.
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
  <TThreadMetadata extends BaseMetadata = ThreadMetadata>(
    {
      thread,
      indentCommentContent = true,
      showActions = "hover",
      showDeletedComments,
      showResolveAction = true,
      showReactions = true,
      showComposer = "collapsed",
      onResolvedChange,
      onCommentEdit,
      onCommentDelete,
      onThreadDelete,
      onAuthorClick,
      onMentionClick,
      overrides,
      className,
      ...props
    }: ThreadProps<TThreadMetadata>,
    forwardedRef: ForwardedRef<HTMLDivElement>
  ) => {
    const { useEditThreadMetadata } = useRoomContextBundle();
    const editThreadMetadata = useEditThreadMetadata();
    const $ = useOverrides(overrides);
    const firstCommentIndex = useMemo(() => {
      return showDeletedComments
        ? 0
        : thread.comments.findIndex((comment) => comment.body);
    }, [showDeletedComments, thread.comments]);

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const handleResolvedChange = useCallback(
      (resolved: boolean) => {
        onResolvedChange?.(resolved);

        editThreadMetadata({ threadId: thread.id, metadata: { resolved } });
      },
      [editThreadMetadata, onResolvedChange, thread.id]
    );

    const handleCommentDelete = useCallback(
      (comment: CommentData) => {
        onCommentDelete?.(comment);

        const filteredComments = thread.comments.filter(
          (comment) => comment.body
        );

        if (filteredComments.length <= 1) {
          onThreadDelete?.(thread);
        }
      },
      [onCommentDelete, onThreadDelete, thread]
    );

    return (
      <TooltipProvider>
        <div
          className={classNames(
            "lb-root lb-thread",
            showActions === "hover" && "lb-thread:show-actions-hover",
            className
          )}
          data-resolved={
            (thread.metadata as ThreadMetadata).resolved ? "" : undefined
          }
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
                  indentContent={indentCommentContent}
                  showDeleted={showDeletedComments}
                  showActions={showActions}
                  showReactions={showReactions}
                  onCommentEdit={onCommentEdit}
                  onCommentDelete={handleCommentDelete}
                  onAuthorClick={onAuthorClick}
                  onMentionClick={onMentionClick}
                  additionalActionsClassName={
                    isFirstComment ? "lb-thread-actions" : undefined
                  }
                  additionalActions={
                    isFirstComment && showResolveAction ? (
                      <Tooltip
                        content={
                          (thread.metadata as ThreadMetadata).resolved
                            ? $.THREAD_UNRESOLVE
                            : $.THREAD_RESOLVE
                        }
                      >
                        <TogglePrimitive.Root
                          pressed={(thread.metadata as ThreadMetadata).resolved}
                          onPressedChange={handleResolvedChange}
                          asChild
                        >
                          <Button
                            className="lb-comment-action"
                            onClick={stopPropagation}
                            aria-label={
                              (thread.metadata as ThreadMetadata).resolved
                                ? $.THREAD_UNRESOLVE
                                : $.THREAD_RESOLVE
                            }
                          >
                            {(thread.metadata as ThreadMetadata).resolved ? (
                              <ResolvedIcon className="lb-button-icon" />
                            ) : (
                              <ResolveIcon className="lb-button-icon" />
                            )}
                          </Button>
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
              defaultCollapsed={showComposer === "collapsed" ? true : undefined}
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
) as <TThreadMetadata extends BaseMetadata = ThreadMetadata>(
  props: ThreadProps<TThreadMetadata> & RefAttributes<HTMLDivElement>
) => JSX.Element;
