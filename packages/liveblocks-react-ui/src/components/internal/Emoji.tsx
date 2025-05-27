import { type ComponentProps, forwardRef } from "react";

import { EMOJI_FONT_FAMILY } from "../../constants";
import { classNames } from "../../utils/class-names";

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
        className={classNames("lb-emoji", className)}
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
