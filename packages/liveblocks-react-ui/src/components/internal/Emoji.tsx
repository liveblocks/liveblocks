import { forwardRef } from "react";

import type { EmojiProps as EmojiPrimitiveProps } from "../../primitives/internal/Emoji.jsx";
import { Emoji as EmojiPrimitive } from "../../primitives/internal/Emoji.jsx";
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
