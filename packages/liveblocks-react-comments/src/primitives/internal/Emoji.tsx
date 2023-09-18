import { Slot } from "@radix-ui/react-slot";
import React, { forwardRef } from "react";

import type { ComponentPropsWithSlot } from "../../types";

const EMOJI_FONT_FAMILY =
  "'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Android Emoji', EmojiSymbols";

interface Props extends ComponentPropsWithSlot<"span"> {
  emoji: string;
}

export const Emoji = forwardRef<HTMLSpanElement, Props>(
  ({ emoji, style, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "span";

    return (
      <Component
        role="img"
        aria-label={emoji}
        style={{
          ...style,
          fontFamily: EMOJI_FONT_FAMILY,
          lineHeight: "1em",
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
