import { Slot } from "@radix-ui/react-slot";
import React, { forwardRef } from "react";

import { EMOJI_FONT_FAMILY } from "../../constants";
import type { ComponentPropsWithSlot } from "../../types";

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
          width: "1ch",
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
