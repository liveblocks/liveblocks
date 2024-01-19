import React, { forwardRef } from "react";

import type { EmojiProps as EmojiPrimitiveProps } from "../../primitives/internal/Emoji";
import { Emoji as EmojiPrimitive } from "../../primitives/internal/Emoji";
import { classNames } from "../../utils/class-names";

export const Emoji = forwardRef<HTMLSpanElement, EmojiPrimitiveProps>(
  ({ className, ...props }, forwardedRef) => {
    return (
      <EmojiPrimitive
        className={classNames("lb-emoji", className)}
        {...props}
        ref={forwardedRef}
      />
    );
  }
);
