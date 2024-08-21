"use client";

import type {
  BaseMetadata,
  CommentData,
  DM,
  ThreadData,
} from "@liveblocks/core";
import {
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
  useThreadSubscription,
} from "@liveblocks/react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type {
  ComponentPropsWithoutRef,
  ForwardedRef,
  RefAttributes,
  SyntheticEvent,
} from "react";
import React, {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ArrowDownIcon } from "../icons/ArrowDown";
import { ResolveIcon } from "../icons/Resolve";
import { ResolvedIcon } from "../icons/Resolved";
import type {
  CommentOverrides,
  ComposerOverrides,
  GlobalOverrides,
  ThreadOverrides,
} from "../overrides";
import { useOverrides } from "../overrides";
import { classNames } from "../utils/class-names";
import { findLastIndex } from "../utils/find-last-index";
import type { CommentProps } from "./Comment";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import { Button } from "./internal/Button";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";

export interface ThreadProps<M extends BaseMetadata = DM>
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * The thread to display.
   */
  thread: ThreadData<M>;

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
   * Whether to show attachments.
   */
  showAttachments?: boolean;

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
   * The event handler called when the thread is deleted.
   * A thread is deleted when all its comments are deleted.
   */
  onThreadDelete?: (thread: ThreadData<M>) => void;

  /**
   * The event handler called when clicking on a comment's author.
   */
  onAuthorClick?: CommentProps["onAuthorClick"];

  /**
   * The event handler called when clicking on a mention.
   */
  onMentionClick?: CommentProps["onMentionClick"];

  /**
   * The event handler called when clicking on a comment's attachment.
   */
  onAttachmentClick?: CommentProps["onAttachmentClick"];

  /**
   * Override the component's strings.
   */
  overrides?: Partial<
    GlobalOverrides & ThreadOverrides & CommentOverrides & ComposerOverrides
  >;
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
export const Thread = forwardRef(
  <M extends BaseMetadata = DM>(
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
      onAttachmentClick,
      overrides,
      className,
      ...props
    }: ThreadProps<M>,
    forwardedRef: ForwardedRef<HTMLDivElement>
  ) => {
    const markThreadAsResolved = useMarkThreadAsResolved();
    const markThreadAsUnresolved = useMarkThreadAsUnresolved();
    const $ = useOverrides(overrides);
    const firstCommentIndex = useMemo(() => {
      return showDeletedComments
        ? 0
        : thread.comments.findIndex((comment) => comment.body);
    }, [showDeletedComments, thread.comments]);
    const lastCommentIndex = useMemo(() => {
      return showDeletedComments
        ? thread.comments.length - 1
        : findLastIndex(thread.comments, (comment) => comment.body);
    }, [showDeletedComments, thread.comments]);
    const { status: subscriptionStatus, unreadSince } = useThreadSubscription(
      thread.id
    );
    const unreadIndex = useMemo(() => {
      // The user is not subscribed to this thread.
      if (subscriptionStatus !== "subscribed") {
        return;
      }

      // The user hasn't read the thread yet, so all comments are unread.
      if (unreadSince === null) {
        return firstCommentIndex;
      }

      // The user has read the thread, so we find the first unread comment.
      const unreadIndex = thread.comments.findIndex(
        (comment) =>
          (showDeletedComments ? true : comment.body) &&
          comment.createdAt > unreadSince
      );

      return unreadIndex >= 0 && unreadIndex < thread.comments.length
        ? unreadIndex
        : undefined;
    }, [
      firstCommentIndex,
      showDeletedComments,
      subscriptionStatus,
      thread.comments,
      unreadSince,
    ]);
    const [newIndex, setNewIndex] = useState<number>();
    const newIndicatorIndex = newIndex === undefined ? unreadIndex : newIndex;

    useEffect(() => {
      if (unreadIndex) {
        // Keep the "new" indicator at the lowest unread index.
        setNewIndex((persistedUnreadIndex) =>
          Math.min(persistedUnreadIndex ?? Infinity, unreadIndex)
        );
      }
    }, [unreadIndex]);

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const handleResolvedChange = useCallback(
      (resolved: boolean) => {
        onResolvedChange?.(resolved);

        if (resolved) {
          markThreadAsResolved(thread.id);
        } else {
          markThreadAsUnresolved(thread.id);
        }
      },
      [
        markThreadAsResolved,
        markThreadAsUnresolved,
        onResolvedChange,
        thread.id,
      ]
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
          data-resolved={thread.resolved ? "" : undefined}
          data-unread={unreadIndex !== undefined ? "" : undefined}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
        >
          <div className="lb-thread-comments">
            {thread.comments.map((comment, index) => {
              const isFirstComment = index === firstCommentIndex;
              const isUnread =
                unreadIndex !== undefined && index >= unreadIndex;

              const children = (
                <Comment
                  key={comment.id}
                  className="lb-thread-comment"
                  data-unread={isUnread ? "" : undefined}
                  comment={comment}
                  indentContent={indentCommentContent}
                  showDeleted={showDeletedComments}
                  showActions={showActions}
                  showReactions={showReactions}
                  onCommentEdit={onCommentEdit}
                  onCommentDelete={handleCommentDelete}
                  onAuthorClick={onAuthorClick}
                  onMentionClick={onMentionClick}
                  onAttachmentClick={onAttachmentClick}
                  autoMarkReadThreadId={
                    index === lastCommentIndex && isUnread
                      ? thread.id
                      : undefined
                  }
                  additionalActionsClassName={
                    isFirstComment ? "lb-thread-actions" : undefined
                  }
                  additionalActions={
                    isFirstComment && showResolveAction ? (
                      <Tooltip
                        content={
                          thread.resolved
                            ? $.THREAD_UNRESOLVE
                            : $.THREAD_RESOLVE
                        }
                      >
                        <TogglePrimitive.Root
                          pressed={thread.resolved}
                          onPressedChange={handleResolvedChange}
                          asChild
                        >
                          <Button
                            className="lb-comment-action"
                            onClick={stopPropagation}
                            aria-label={
                              thread.resolved
                                ? $.THREAD_UNRESOLVE
                                : $.THREAD_RESOLVE
                            }
                          >
                            {thread.resolved ? (
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

              return index === newIndicatorIndex &&
                newIndicatorIndex !== firstCommentIndex &&
                newIndicatorIndex <= lastCommentIndex ? (
                <Fragment key={comment.id}>
                  <div
                    className="lb-thread-new-indicator"
                    aria-label={$.THREAD_NEW_INDICATOR_DESCRIPTION}
                  >
                    <span className="lb-thread-new-indicator-label">
                      <ArrowDownIcon className="lb-thread-new-indicator-label-icon" />
                      {$.THREAD_NEW_INDICATOR}
                    </span>
                  </div>
                  {children}
                </Fragment>
              ) : (
                children
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
) as <M extends BaseMetadata = DM>(
  props: ThreadProps<M> & RefAttributes<HTMLDivElement>
) => JSX.Element;
