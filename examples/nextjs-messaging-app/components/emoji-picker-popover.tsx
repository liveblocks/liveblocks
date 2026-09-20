"use client";

import * as Popover from "@radix-ui/react-popover";
import { EmojiPicker } from "frimousse";
import { type ReactNode, useState } from "react";

export function EmojiPickerPopover({
  children,
  onSelect,
  onOpenChange,
}: {
  children: ReactNode;
  onSelect: (emoji: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-30"
        >
          <EmojiPicker.Root
            onEmojiSelect={({ emoji }) => {
              handleOpenChange(false);
              onSelect(emoji);
            }}
            className="isolate flex h-[342px] w-fit flex-col rounded-lg border border-neutral-200 bg-white shadow-lg"
          >
            <EmojiPicker.Search className="z-10 mx-2 mt-2 appearance-none rounded-md bg-neutral-100 px-2.5 py-2 text-sm" />
            <EmojiPicker.Viewport className="relative flex-1 outline-hidden">
              <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                No emoji found.
              </EmojiPicker.Empty>
              <EmojiPicker.List
                className="select-none pb-1.5"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      className="bg-white px-3 pb-1.5 pt-3 text-xs font-medium text-neutral-600"
                      {...props}
                    >
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...props }) => (
                    <div className="scroll-my-1.5 px-1.5" {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button
                      className="flex size-8 items-center justify-center rounded-md text-lg data-[active]:bg-neutral-100"
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
