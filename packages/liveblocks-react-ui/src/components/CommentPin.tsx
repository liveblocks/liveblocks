"use client";

import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { forwardRef } from "react";

import { cn } from "../utils/cn";
import { px } from "../utils/px";
import { Avatar } from "./internal/Avatar";

export interface CommentPinProps extends ComponentPropsWithoutRef<"button"> {
  /**
   * The corner that points to the comment position.
   * Defaults to the bottom left corner.
   */
  corner?: "top-left" | "top-right" | "bottom-right" | "bottom-left";

  /**
   * The user ID to optionally display an avatar for.
   */
  userId?: string;

  /**
   * The size of the pin.
   */
  size?: string | number;
}

/**
 * Displays a comment pin that can be used as a trigger
 * for `FloatingComposer` and `FloatingThread`.
 */
export const CommentPin = forwardRef<HTMLButtonElement, CommentPinProps>(
  (
    {
      corner = "bottom-left",
      userId,
      size,
      type = "button",
      className,
      style,
      ...props
    },
    forwardedRef
  ) => {
    return (
      <button
        className={cn("lb-root lb-comment-pin", className)}
        data-corner={corner}
        style={{ "--lb-comment-pin-size": px(size), ...style } as CSSProperties}
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
