import { type ComponentProps, forwardRef } from "react";

import { EMOJI_FONT_FAMILY } from "../../constants";
import { cn } from "../../utils/cn";

interface EmojiProps extends ComponentProps<"span"> {
  emoji: string;
}

export const Emoji = forwardRef<HTMLSpanElement, EmojiProps>(
  ({ emoji, className, style, ...props }, forwardedRef) => {
    return (
      <span
        role="img"
        aria-label={emoji}
        data-emoji={emoji}
        className={cn("lb-emoji", className)}
        style={{
          ...style,
          fontFamily: EMOJI_FONT_FAMILY,
        }}
        {...props}
        ref={forwardedRef}
      >
        {emoji}
      </span>
    );
  }
);
