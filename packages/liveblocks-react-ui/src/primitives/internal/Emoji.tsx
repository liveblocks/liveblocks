import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";

import { EMOJI_FONT_FAMILY } from "../../constants.js";
import type { ComponentPropsWithSlot } from "../../types.js";

export interface EmojiProps extends ComponentPropsWithSlot<"span"> {
  emoji: string;
}

export const Emoji = forwardRef<HTMLSpanElement, EmojiProps>(
  ({ emoji, style, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "span";

    return (
      <Component
        role="img"
        aria-label={emoji}
        data-emoji={emoji}
        style={{
          ...style,
          fontFamily: EMOJI_FONT_FAMILY,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1em",
          whiteSpace: "nowrap",
        }}
        {...props}
        ref={forwardedRef}
      >
        {emoji}
      </Component>
    );
  }
);
