import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "./Button";
import { Icon } from "@liveblocks/react-ui";
import { EmojiPicker } from "frimousse";
import { useAddReaction } from "@liveblocks/react/suspense";
import { CommentData } from "@liveblocks/client";

export function AddReaction({ comment }: { comment: CommentData }) {
  const addReaction = useAddReaction();

  return (
    <Popover.Root>
      <Popover.Trigger className="-mr-1 rounded p-1 hover:bg-gray-100">
        <Icon.Emoji className="h-[22px] w-[22px] text-gray-400" />
      </Popover.Trigger>
      <Popover.Anchor />
      <Popover.Portal>
        <Popover.Content>
          <EmojiPicker.Root
            onEmojiSelect={({ emoji }) => {
              addReaction({
                threadId: comment.threadId,
                commentId: comment.id,
                emoji,
              });
            }}
            className="isolate flex h-[368px] w-fit flex-col overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <EmojiPicker.Search className="ring-0.5 z-10 mx-2 mt-2 appearance-none rounded-md bg-neutral-100 px-2.5 py-2 text-sm outline-0 ring-blue-500 focus:ring" />
            <EmojiPicker.Viewport className="outline-hidden relative flex-1">
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
                    <div className="scroll-my-1 px-1" {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded text-base data-[active]:bg-blue-200"
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
