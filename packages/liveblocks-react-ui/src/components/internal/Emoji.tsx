import { forwardRef } from "react";

import type { EmojiProps as EmojiPrimitiveProps } from "../../primitives/internal/Emoji.js";
import { Emoji as EmojiPrimitive } from "../../primitives/internal/Emoji.js";
import { classNames } from "../../utils/class-names.js";

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
