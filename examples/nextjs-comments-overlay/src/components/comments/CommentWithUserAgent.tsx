"use client";

import { Comment } from "@liveblocks/react-ui";
import { ComponentPropsWithoutRef } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import styles from "./CommentWithUserAgent.module.css";

export function CommentWithUserAgent({
  comment,
  ...props
}: ComponentPropsWithoutRef<typeof Comment>) {
  return (
    <Comment
      {...props}
      comment={comment}
      author={
        <span className={styles.commentAuthor}>
          <Comment.Author userId={comment.userId} />
          {comment.metadata.userAgent ? (
            <TooltipPrimitive.Root>
              <TooltipPrimitive.Trigger
                className={styles.userAgentTooltipTrigger}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </TooltipPrimitive.Trigger>
              <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                  sideOffset={8}
                  className={styles.userAgentTooltipContent}
                >
                  {comment.metadata.userAgent}
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
          ) : null}
        </span>
      }
    />
  );
}
