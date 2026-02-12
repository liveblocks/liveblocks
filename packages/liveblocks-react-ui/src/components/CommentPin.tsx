"use client";

import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";

import { cn } from "../utils/cn";
import { Avatar } from "./internal/Avatar";

export interface CommentPinProps extends ComponentPropsWithoutRef<"button"> {
  /**
   * The corner that points to the comment position.
   */
  corner?: "top-left" | "top-right" | "bottom-right" | "bottom-left";

  /**
   * The user ID to optionally display an avatar for.
   */
  userId?: string;
}

/**
 * Displays a comment pin that can be used as a trigger
 * for `FloatingComposer` and `FloatingThread`.
 */
export const CommentPin = forwardRef<HTMLButtonElement, CommentPinProps>(
  (
    { corner = "bottom-left", userId, type = "button", className, ...props },
    forwardedRef
  ) => {
    return (
      <button
        className={cn("lb-root lb-comment-pin", className)}
        data-corner={corner}
        type={type}
        {...props}
        ref={forwardedRef}
      >
        {userId ? (
          <Avatar className="lb-comment-pin-avatar" userId={userId} />
        ) : null}
      </button>
    );
  }
);
