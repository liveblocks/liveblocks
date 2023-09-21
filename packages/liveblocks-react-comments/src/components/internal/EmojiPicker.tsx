import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback, useState } from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { useOverrides } from "../../overrides";
import * as EmojiPickerPrimitive from "../../primitives/EmojiPicker";
import { classNames } from "../../utils/class-names";

interface Props extends ComponentPropsWithoutRef<"div"> {
  onOpenChange?: (open: boolean) => void;
  onEmojiSelect?: (reaction: string) => void;
}

export const EmojiPicker = forwardRef<HTMLDivElement, Props>(
  (
    { onEmojiSelect, onOpenChange, children, className, ...props },
    forwardedRef
  ) => {
    const [isOpen, setOpen] = useState(false);
    const $ = useOverrides();

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
              "lb-root lb-elevation lb-emoji-picker",
              className
            )}
            {...props}
            ref={forwardedRef}
          >
            <EmojiPickerPrimitive.Root onEmojiSelect={onEmojiSelect}>
              <div className="lb-emoji-picker-header">
                <EmojiPickerPrimitive.Search
                  className="lb-emoji-picker-search"
                  placeholder={$.EMOJI_PICKER_SEARCH_PLACEHOLDER}
                />
              </div>
              <EmojiPickerPrimitive.List className="lb-emoji-picker-list" />
            </EmojiPickerPrimitive.Root>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);

export { PopoverTrigger as EmojiPickerTrigger } from "@radix-ui/react-popover";
