import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { useOverrides } from "../../overrides";
import * as EmojiPickerPrimitive from "../../primitives/EmojiPicker";
import type {
  EmojiPickerContentCategoryHeaderProps,
  EmojiPickerContentEmojiProps,
  EmojiPickerContentEmojiRowProps,
} from "../../primitives/EmojiPicker/types";
import { Emoji } from "../../primitives/internal/Emoji";
import { classNames } from "../../utils/class-names";

interface Props extends ComponentPropsWithoutRef<"div"> {
  onOpenChange?: (open: boolean) => void;
  onEmojiSelect?: (reaction: string) => void;
}

function EmojiPickerCategoryHeader({
  category,
  className,
  ...props
}: EmojiPickerContentCategoryHeaderProps) {
  return (
    <div
      className={classNames("lb-emoji-picker-category-header", className)}
      {...props}
    >
      <span className="lb-emoji-picker-category-header-title">{category}</span>
    </div>
  );
}

function EmojiPickerEmojiRow({
  context,
  children,
  className,
  ...props
}: EmojiPickerContentEmojiRowProps) {
  const isFirstRow = useMemo(
    () => context.categoryRowIndex === 0,
    [context.categoryRowIndex]
  );
  const isLastRow = useMemo(
    () => context.categoryRowIndex === context.categoryRowsCount - 1,
    [context.categoryRowIndex, context.categoryRowsCount]
  );

  return (
    <div
      className={classNames("lb-emoji-picker-emoji-row", className)}
      data-first={isFirstRow ? "" : undefined}
      data-last={isLastRow ? "" : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

function EmojiPickerEmoji({
  emoji,
  className,
  ...props
}: EmojiPickerContentEmojiProps) {
  return (
    <button
      className={classNames("lb-emoji-picker-emoji", className)}
      {...props}
    >
      <Emoji emoji={emoji} />
    </button>
  );
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
                  autoFocus
                />
              </div>
              <EmojiPickerPrimitive.Content
                className="lb-emoji-picker-content"
                components={{
                  CategoryHeader: EmojiPickerCategoryHeader,
                  EmojiRow: EmojiPickerEmojiRow,
                  Emoji: EmojiPickerEmoji,
                }}
              />
            </EmojiPickerPrimitive.Root>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);

export { PopoverTrigger as EmojiPickerTrigger } from "@radix-ui/react-popover";
