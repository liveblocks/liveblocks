"use client";

import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
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

  /**
   * The padding within the pin.
   */
  padding?: string | number;

  /**
   * The content shown in the pin.
   * If provided, the `userId` prop is ignored.
   */
  children?: ReactNode;
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
      padding,
      type = "button",
      className,
      style,
      children,
      ...props
    },
    forwardedRef
  ) => {
    return (
      <button
        className={cn("lb-root lb-comment-pin", className)}
        data-corner={corner}
        style={
          {
            "--lb-comment-pin-size": px(size),
            "--lb-comment-pin-padding": px(padding),
            ...style,
          } as CSSProperties
        }
        type={type}
        {...props}
        ref={forwardedRef}
      >
        {children ??
          (userId ? (
            <Avatar className="lb-comment-pin-avatar" userId={userId} />
          ) : null)}
      </button>
    );
  }
);
