import { useState, ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
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
      <Popover.Trigger>{children}</Popover.Trigger>
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
              setOpen(false);
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
