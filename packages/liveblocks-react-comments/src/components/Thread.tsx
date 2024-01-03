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

// interface UnreadIndicatorProps extends ComponentPropsWithoutRef<"div"> {
//   threadId: string;
// }

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

// function UnreadIndicator({
//   threadId,
//   className,
//   ...props
// }: UnreadIndicatorProps) {
//   const [isHovered, setHovered] = useState(false);
//   const [isFocused, setFocused] = useState(false);
//   const showMarkAsRead = isHovered || isFocused;

//   const handleClick = useCallback(() => {
//     // [comments-unread] TODO: Mark thread as read
//     console.log("Mark thread as read", threadId);
//   }, [threadId]);

//   const handleHoverStart = useCallback(() => {
//     setHovered(true);
//   }, []);

//   const handleHoverEnd = useCallback(() => {
//     setHovered(false);
//   }, []);

//   const handleFocusStart = useCallback(() => {
//     setFocused(true);
//   }, []);

//   const handleFocusEnd = useCallback(() => {
//     setFocused(false);
//   }, []);

//   return (
//     <div
//       className={classNames(
//         "lb-thread-unread-separator",
//         showMarkAsRead && "lb-thread-unread-separator:mark-as-read",
//         className
//       )}
//       {...props}
//     >
//       <button
//         className="lb-thread-unread-indicator"
//         onClick={handleClick}
//         onPointerEnter={handleHoverStart}
//         onPointerLeave={handleHoverEnd}
//         onPointerCancel={handleHoverEnd}
//         onFocus={handleFocusStart}
//         onBlur={handleFocusEnd}
//       >
//         {showMarkAsRead ? (
//           <>
//             <CheckIcon className="lb-thread-unread-indicator-icon" />
//             Mark as read
//           </>
//         ) : (
//           <>
//             <ArrowDownIcon className="lb-thread-unread-indicator-icon" />
//             New
//           </>
//         )}
//       </button>
//     </div>
//   );
// }

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
    const { useEditThreadMetadata } = useRoomContextBundle();
    const editThreadMetadata = useEditThreadMetadata();
    const $ = useOverrides(overrides);
    const firstCommentIndex = useMemo(() => {
      return showDeletedComments
        ? 0
        : thread.comments.findIndex((comment) => comment.body);
    }, [showDeletedComments, thread.comments]);
    // const lastCommentIndex = useMemo(() => {
    //   return showDeletedComments
    //     ? thread.comments.length - 1
    //     : findLastIndex(thread.comments, (comment) => comment.body);
    // }, [showDeletedComments, thread.comments]);
    // const unreadCommentIndex = useMemo(() => {
    //   // If not subscribed to the thread, return nothing
    //   if (!thread.notificationInfo) {
    //     return;
    //   }

    //   if (!thread.notificationInfo.readAt) {
    //     // If subscribed to the thread but not read yet, return first visible comment?
    //     if (showDeletedComments) {
    //       return 0;
    //     } else {
    //       return thread.comments.findIndex((comment) => comment.body);
    //     }
    //   } else {
    //     const readAt = new Date(thread.notificationInfo.readAt);
    //     const notifiedAt = new Date(thread.notificationInfo.notifiedAt);

    //     // If subscribed to the thread and not fully read, return first visible unread comment
    //     if (readAt < notifiedAt) {
    //       if (showDeletedComments) {
    //         return thread.comments.findIndex(
    //           (comment) => new Date(comment.createdAt) > readAt
    //         );
    //       } else {
    //         return thread.comments.findIndex(
    //           (comment) => comment.body && new Date(comment.createdAt) > readAt
    //         );
    //       }
    //     }
    //   }

    //   return;
    // }, [showDeletedComments, thread]);

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
          // data-unread={unreadCommentIndex !== undefined ? "" : undefined}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
        >
          <div className="lb-thread-comments">
            {thread.comments.map((comment, index) => {
              const isFirstComment = index === firstCommentIndex;
              // const isUnread =
              //   unreadCommentIndex !== undefined && index >= unreadCommentIndex;

              const children = (
                <Comment
                  key={comment.id}
                  className="lb-thread-comment"
                  // data-unread={isUnread ? "" : undefined}
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

              // return index === unreadCommentIndex ? (
              //   <Fragment key={comment.id}>
              //     <UnreadIndicator threadId={thread.id} />
              //     {children}
              //   </Fragment>
              // ) : (
              //   children
              // );

              return children;
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
