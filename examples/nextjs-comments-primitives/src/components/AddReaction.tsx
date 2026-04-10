import { useState, ReactNode } from "react";
import { Popover } from "radix-ui";
import { useAddReaction } from "@liveblocks/react/suspense";
import { CommentData } from "@liveblocks/client";
import { EmojiPicker } from "frimousse";

export function AddReaction({
  comment,
  children,
}: {
  comment: CommentData;
  children: ReactNode;
}) {
  const addReaction = useAddReaction();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Anchor />
      <Popover.Portal>
        <Popover.Content sideOffset={8}>
          <EmojiPicker.Root
            onEmojiSelect={({ emoji }) => {
              addReaction({
                threadId: comment.threadId,
                commentId: comment.id,
                emoji,
              });
              setOpen(false);
            }}
            columns={10}
            className="isolate flex h-[368px] w-fit flex-col overflow-hidden rounded-xl bg-white shadow-xl"
          >
            <EmojiPicker.Search className="ring-0.5 z-10 mx-2 mt-2 appearance-none rounded-md bg-gray-100 px-2.5 py-2 text-sm ring-blue-500 outline-0 focus:ring-3" />
            <EmojiPicker.Viewport className="relative flex-1 outline-hidden">
              <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                No emoji found.
              </EmojiPicker.Empty>
              <EmojiPicker.List
                className="pb-1 select-none"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      className="bg-white px-3 pt-3 pb-1.5 text-xs font-medium text-gray-600"
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
                      className="flex h-7 w-7 items-center justify-center rounded-md text-base data-active:bg-gray-100"
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
