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
import React, {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { ArrowDownIcon } from "../icons/ArrowDown";
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
import { findLastIndex } from "../utils/find-last-index";
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
   * The event handler called when the thread is deleted.
   * A thread is deleted when all its comments are deleted.
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
export const Thread = forwardRef(
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
    const { useEditThreadMetadata, useThreadUnreadSince } =
      useRoomContextBundle();
    const editThreadMetadata = useEditThreadMetadata();
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
    const unreadSince = useThreadUnreadSince(thread.id);
    const firstUnreadCommentIndex = useMemo(() => {
      if (!unreadSince) {
        return;
      }

      const firstUnreadCommentIndex = thread.comments.findIndex(
        (comment) =>
          (showDeletedComments ? true : comment.body) &&
          comment.createdAt > unreadSince
      );

      return firstUnreadCommentIndex >= 0 &&
        firstUnreadCommentIndex < thread.comments.length
        ? firstUnreadCommentIndex
        : undefined;
    }, [showDeletedComments, thread, unreadSince]);
    const previousFirstUnreadCommentIndex = useRef<number>();

    useEffect(() => {
      previousFirstUnreadCommentIndex.current = firstUnreadCommentIndex;
    }, [firstUnreadCommentIndex]);

    // Keep track of the first unread comment index to persist the
    // unread indicator while still marking the thread as read instantly.
    const persistedFirstUnreadCommentIndex = useMemo(() => {
      if (
        previousFirstUnreadCommentIndex.current !== undefined &&
        firstUnreadCommentIndex === undefined
      ) {
        return previousFirstUnreadCommentIndex.current;
      } else {
        return firstUnreadCommentIndex;
      }
    }, [firstUnreadCommentIndex]);

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
          data-unread={firstUnreadCommentIndex !== undefined ? "" : undefined}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
        >
          {/* Debug */}
          <div>
            <p>Thread creation date: {thread.createdAt.toISOString()}</p>
            <p>Thread unread since: {unreadSince?.toISOString() ?? "-"}</p>
            <p>First unread comment index: {firstUnreadCommentIndex ?? "-"}</p>
            <p>
              First unread comment index (persisted):{" "}
              {persistedFirstUnreadCommentIndex ?? "-"}
            </p>
            <p>Last comment index: {lastCommentIndex}</p>
          </div>
          <div className="lb-thread-comments">
            {thread.comments.map((comment, index) => {
              const isFirstComment = index === firstCommentIndex;
              const isUnread =
                firstUnreadCommentIndex !== undefined &&
                index >= firstUnreadCommentIndex;

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
                  // markThreadAsReadWhenVisible={
                  //   index === lastCommentIndex && isUnread
                  //     ? thread.id
                  //     : undefined
                  // }
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

              return index === persistedFirstUnreadCommentIndex &&
                persistedFirstUnreadCommentIndex !== firstCommentIndex ? (
                <Fragment key={comment.id}>
                  <div
                    className="lb-thread-unread-indicator"
                    aria-label={$.THREAD_UNREAD_INDICATOR_DESCRIPTION}
                  >
                    <span className="lb-thread-unread-indicator-label">
                      <ArrowDownIcon className="lb-thread-unread-indicator-label-icon" />
                      {$.THREAD_UNREAD_INDICATOR}
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
) as <TThreadMetadata extends BaseMetadata = ThreadMetadata>(
  props: ThreadProps<TThreadMetadata> & RefAttributes<HTMLDivElement>
) => JSX.Element;
