import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  type Emoji as FrimousseEmoji,
  EmojiPicker as EmojiPickerPrimitive,
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  type Locale,
} from "frimousse";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useCallback, useState } from "react";

import { useLiveblocksUIConfig } from "../../config";
import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../../constants";
import { SearchIcon } from "../../icons/Search";
import { SpinnerIcon } from "../../icons/Spinner";
import { useOverrides } from "../../overrides";
import { classNames } from "../../utils/class-names";
import { Emoji } from "./Emoji";
import { Tooltip } from "./Tooltip";

export interface EmojiPickerProps extends ComponentPropsWithoutRef<"div"> {
  onOpenChange?: (open: boolean) => void;
  onEmojiSelect?: (emoji: string) => void;
}

function EmojiPickerListEmoji({
  emoji,
  isActive: _,
  className,
  ...props
}: EmojiPickerListEmojiProps) {
  return (
    <button
      className={classNames("lb-emoji-picker-emoji", className)}
      aria-label={emoji.label}
      {...props}
    >
      <Emoji emoji={emoji.emoji} />
    </button>
  );
}

function EmojiPickerListRow({
  children,
  className,
  ...props
}: EmojiPickerListRowProps) {
  return (
    <div className={classNames("lb-emoji-picker-row", className)} {...props}>
      {children}
    </div>
  );
}

function EmojiPickerListCategoryHeader({
  category,
  className,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      className={classNames("lb-emoji-picker-category-header", className)}
      {...props}
    >
      <span className="lb-emoji-picker-category-header-title">
        {category.label}
      </span>
    </div>
  );
}

export const EmojiPicker = forwardRef<HTMLDivElement, EmojiPickerProps>(
  (
    { onEmojiSelect, onOpenChange, children, className, ...props },
    forwardedRef
  ) => {
    const [isOpen, setOpen] = useState(false);
    const { portalContainer } = useLiveblocksUIConfig();
    const $ = useOverrides();

    const handleOpenChange = useCallback(
      (isOpen: boolean) => {
        setOpen(isOpen);
        onOpenChange?.(isOpen);
      },
      [onOpenChange]
    );

    const handleEmojiSelect = useCallback(
      ({ emoji }: FrimousseEmoji) => {
        setOpen(false);
        onEmojiSelect?.(emoji);
      },
      [onEmojiSelect]
    );

    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        {children}
        <PopoverPrimitive.Portal container={portalContainer}>
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
            asChild
          >
            <EmojiPickerPrimitive.Root
              onEmojiSelect={handleEmojiSelect}
              locale={$.locale as Locale}
              emojiVersion={15.1}
              columns={10}
            >
              <div className="lb-emoji-picker-header">
                <div className="lb-emoji-picker-search-container">
                  <EmojiPickerPrimitive.Search
                    className="lb-emoji-picker-search"
                    placeholder={$.EMOJI_PICKER_SEARCH_PLACEHOLDER}
                    autoFocus
                  />
                  <SearchIcon />
                </div>
              </div>
              <EmojiPickerPrimitive.Viewport className="lb-emoji-picker-content">
                <EmojiPickerPrimitive.Loading className="lb-loading lb-emoji-picker-loading">
                  <SpinnerIcon />
                </EmojiPickerPrimitive.Loading>
                <EmojiPickerPrimitive.Empty className="lb-empty lb-emoji-picker-empty">
                  {$.EMOJI_PICKER_EMPTY}
                </EmojiPickerPrimitive.Empty>
                <EmojiPickerPrimitive.List
                  className="lb-emoji-picker-list"
                  components={{
                    CategoryHeader: EmojiPickerListCategoryHeader,
                    Row: EmojiPickerListRow,
                    Emoji: EmojiPickerListEmoji,
                  }}
                />
              </EmojiPickerPrimitive.Viewport>
              <div className="lb-emoji-picker-footer">
                <EmojiPickerPrimitive.ActiveEmoji>
                  {({ emoji }) =>
                    emoji ? (
                      <>
                        <div className="lb-emoji-picker-active-emoji">
                          {emoji.emoji}
                        </div>
                        <span className="lb-emoji-picker-active-emoji-label">
                          {emoji.label}
                        </span>
                      </>
                    ) : (
                      <span className="lb-emoji-picker-active-emoji-label lb-emoji-picker-active-emoji-label-placeholder">
                        Select an emoji…
                      </span>
                    )
                  }
                </EmojiPickerPrimitive.ActiveEmoji>
                <Tooltip content={$.EMOJI_PICKER_CHANGE_SKIN_TONE}>
                  <EmojiPickerPrimitive.SkinToneSelector className="lb-button lb-emoji-picker-skin-tone-selector" />
                </Tooltip>
              </div>
            </EmojiPickerPrimitive.Root>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);

export { PopoverTrigger as EmojiPickerTrigger } from "@radix-ui/react-popover";
