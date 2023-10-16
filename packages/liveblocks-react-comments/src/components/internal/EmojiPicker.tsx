import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { SearchIcon } from "../../icons/Search";
import { SpinnerIcon } from "../../icons/Spinner";
import { useOverrides } from "../../overrides";
import * as EmojiPickerPrimitive from "../../primitives/EmojiPicker";
import type {
  EmojiPickerContentCategoryHeaderProps,
  EmojiPickerContentEmojiProps,
  EmojiPickerContentEmptyProps,
  EmojiPickerContentErrorProps,
  EmojiPickerContentGridProps,
  EmojiPickerContentLoadingProps,
  EmojiPickerContentRowProps,
} from "../../primitives/EmojiPicker/types";
import { classNames } from "../../utils/class-names";
import { Emoji } from "../internal/Emoji";

export interface EmojiPickerProps extends ComponentPropsWithoutRef<"div"> {
  onOpenChange?: (open: boolean) => void;
  onEmojiSelect?: (emoji: string) => void;
}

function EmojiPickerLoading({
  className,
  ...props
}: EmojiPickerContentLoadingProps) {
  return (
    <div
      className={classNames("lb-emoji-picker-loading", className)}
      {...props}
    >
      <SpinnerIcon />
    </div>
  );
}

function EmojiPickerEmpty({
  className,
  ...props
}: EmojiPickerContentEmptyProps) {
  const $ = useOverrides();

  return (
    <div className={classNames("lb-emoji-picker-empty", className)} {...props}>
      {$.EMOJI_PICKER_EMPTY}
    </div>
  );
}

function EmojiPickerError({
  error,
  className,
  ...props
}: EmojiPickerContentErrorProps) {
  const $ = useOverrides();

  return (
    <div className={classNames("lb-emoji-picker-error", className)} {...props}>
      {$.EMOJI_PICKER_ERROR(error)}
    </div>
  );
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

function EmojiPickerGrid({
  children,
  className,
  ...props
}: EmojiPickerContentGridProps) {
  return (
    <div className={classNames("lb-emoji-picker-grid", className)} {...props}>
      {children}
    </div>
  );
}

function EmojiPickerRow({
  attributes,
  children,
  className,
  ...props
}: EmojiPickerContentRowProps) {
  const isFirstRow = useMemo(
    () => attributes.categoryRowIndex === 0,
    [attributes.categoryRowIndex]
  );
  const isLastRow = useMemo(
    () => attributes.categoryRowIndex === attributes.categoryRowsCount - 1,
    [attributes.categoryRowIndex, attributes.categoryRowsCount]
  );

  return (
    <div
      className={classNames("lb-emoji-picker-row", className)}
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

export const EmojiPicker = forwardRef<HTMLDivElement, EmojiPickerProps>(
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

    const handleEmojiSelect = useCallback(
      (emoji: string) => {
        setOpen(false);
        onEmojiSelect?.(emoji);
      },
      [onEmojiSelect]
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
              "lb-root lb-portal lb-elevation lb-emoji-picker",
              className
            )}
            {...props}
            ref={forwardedRef}
          >
            <EmojiPickerPrimitive.Root
              onEmojiSelect={handleEmojiSelect}
              locale={$.locale}
            >
              <div className="lb-emoji-picker-header">
                <div className="lb-emoji-picker-search-container">
                  <EmojiPickerPrimitive.Search
                    className="lb-emoji-picker-search"
                    placeholder={$.EMOJI_PICKER_SEARCH_PLACEHOLDER}
                    autoFocus
                  />
                  <SearchIcon className="lb-emoji-picker-search-icon" />
                </div>
              </div>
              <EmojiPickerPrimitive.Content
                className="lb-emoji-picker-content"
                components={{
                  Loading: EmojiPickerLoading,
                  Empty: EmojiPickerEmpty,
                  Error: EmojiPickerError,
                  CategoryHeader: EmojiPickerCategoryHeader,
                  Grid: EmojiPickerGrid,
                  Row: EmojiPickerRow,
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
