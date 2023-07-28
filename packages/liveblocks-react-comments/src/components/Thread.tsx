import type { ThreadData } from "@liveblocks/core";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback } from "react";

import { useCommentsContext } from "../factory";
import { ResolveIcon } from "../icons/resolve";
import { ResolvedIcon } from "../icons/resolved";
import { classNames } from "../utils/class-names";
import type { CommentProps } from "./Comment";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import { Tooltip, TooltipProvider } from "./Tooltip";

export interface ThreadProps
  extends ComponentPropsWithoutRef<"div">,
    Pick<CommentProps, "indentBody" | "alwaysShowActions"> {
  /**
   * TODO: JSDoc
   */
  thread: ThreadData<{ resolved?: boolean }>;

  /**
   * TODO: JSDoc
   */
  showComposer?: boolean;
}

export const Thread = forwardRef<HTMLDivElement, ThreadProps>(
  (
    {
      thread,
      indentBody,
      alwaysShowActions,
      showComposer,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useEditThreadMetadata } = useCommentsContext();
    const editThreadMetadata = useEditThreadMetadata();

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
            "lb-thread",
            alwaysShowActions && "lb-thread:always-show-actions",
            className
          )}
          data-resolved={thread.metadata.resolved ? "" : undefined}
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
                  alwaysShowActions={alwaysShowActions}
                  additionalActionsClassName={
                    isFirstComment ? "lb-thread-actions" : undefined
                  }
                  additionalActions={
                    isFirstComment ? (
                      <Tooltip
                        content={
                          thread.metadata.resolved
                            ? "Re-open thread"
                            : "Resolve thread"
                        }
                      >
                        <TogglePrimitive.Root
                          className="lb-button lb-comment-action"
                          pressed={thread.metadata?.resolved}
                          onPressedChange={handleResolvedChange}
                          aria-label={
                            thread.metadata.resolved
                              ? "Re-open thread"
                              : "Resolve thread"
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
            <Composer className="lb-thread-composer" threadId={thread.id} />
          )}
        </div>
      </TooltipProvider>
    );
  }
);
