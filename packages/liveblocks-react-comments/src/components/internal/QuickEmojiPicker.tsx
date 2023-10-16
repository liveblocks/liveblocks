import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback, useState } from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { classNames } from "../../utils/class-names";
import { Emoji } from "../internal/Emoji";

export interface QuickEmojiPickerProps extends ComponentPropsWithoutRef<"div"> {
  onOpenChange?: (open: boolean) => void;
  emojis: string[];
  onEmojiSelect?: (emoji: string) => void;
}

// TODO: This should be a dropdown but @radix-ui/react-dropdown-menu
//       doesn't support using an horizontal orientation yet.
//       See: https://github.com/radix-ui/primitives/issues/2001
export const QuickEmojiPicker = forwardRef<
  HTMLDivElement,
  QuickEmojiPickerProps
>(
  (
    { emojis, onEmojiSelect, onOpenChange, children, className, ...props },
    forwardedRef
  ) => {
    const [isOpen, setOpen] = useState(false);

    const handleOpenChange = useCallback(
      (isOpen: boolean) => {
        setOpen(isOpen);
        onOpenChange?.(isOpen);
      },
      [onOpenChange]
    );

    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        {children}
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="top"
            align="center"
            sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
            collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
            className={classNames(
              "lb-root lb-portal lb-elevation lb-quick-emoji-picker",
              className
            )}
            {...props}
            ref={forwardedRef}
          >
            {emojis.map((emoji, index) => (
              <button
                key={index}
                className="lb-quick-emoji-picker-emoji"
                onClick={() => {
                  setOpen(false);
                  onEmojiSelect?.(emoji);
                }}
              >
                <Emoji emoji={emoji} />
              </button>
            ))}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);

export { PopoverTrigger as QuickEmojiPickerTrigger } from "@radix-ui/react-popover";
