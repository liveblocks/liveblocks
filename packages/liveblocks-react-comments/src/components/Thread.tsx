import type { ThreadData } from "@liveblocks/core";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback } from "react";

import { useCommentsContext } from "../factory";
import { ResolveIcon } from "../icons/resolve";
import { ResolvedIcon } from "../icons/resolved";
import type {
  CommentOverrides,
  ComposerOverrides,
  ThreadOverrides,
} from "../overrides";
import { classNames } from "../utils/class-names";
import type { CommentProps } from "./Comment";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";

export interface ThreadProps
  extends ComponentPropsWithoutRef<"div">,
    Pick<CommentProps, "indentBody" | "showActions"> {
  /**
   * The thread to display.
   */
  thread: ThreadData<{ resolved?: boolean }>;

  /**
   * Whether to show the composer to reply to the thread.
   */
  showComposer?: boolean;

  /**
   * TODO: Add description
   */
  overrides?: Partial<ThreadOverrides & CommentOverrides & ComposerOverrides>;
}

export const Thread = forwardRef<HTMLDivElement, ThreadProps>(
  (
    {
      thread,
      indentBody,
      showActions = "hover",
      showComposer,
      overrides,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useEditThreadMetadata, useOverrides } = useCommentsContext();
    const editThreadMetadata = useEditThreadMetadata();
    const $ = useOverrides(overrides);

    const handleResolvedChange = useCallback(
      (resolved: boolean) => {
        editThreadMetadata({ threadId: thread.id, metadata: { resolved } });
      },
      [editThreadMetadata, thread.id]
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
              // TODO: Take into account that deleted comments will not render by default, unless there's an option to show them with a placeholder
              const isFirstComment = index === 0;

              return (
                <Comment
                  key={comment.id}
                  className="lb-thread-comment"
                  comment={comment}
                  indentBody={indentBody}
                  showActions={showActions}
                  additionalActionsClassName={
                    isFirstComment ? "lb-thread-actions" : undefined
                  }
                  additionalActions={
                    isFirstComment ? (
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
          {/* TODO: Change placeholder and button label to indicate that it's a reply */}
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
