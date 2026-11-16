"use client";

import { GripVerticalIcon } from "lucide-react";
import Link from "next/link";
import { EditingAvatars } from "@/components/editing-avatars";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTime } from "@/lib/dates";
import { PLATFORM_INFO, PlatformBadge } from "@/lib/platforms";
import { STATUS_INFO, type PostData } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { PostBoardHandle, PostBoardPost } from "./post-board";

/**
 * A post on the calendar. The card is a drop-and-drag item: a pointer can
 * drag it anywhere, the link inside opens the composer, and the handle picks
 * it up with the keyboard. ui-sdk follows a pointer drag with a copy of this
 * element, so the card at rest and the one being dragged look the same.
 */
export function PostCard({ post, href }: { post: PostData; href: string }) {
  const status = STATUS_INFO[post.status];
  const platform = PLATFORM_INFO[post.platform];
  const label = `${platform.label} post at ${formatTime(post.time)}, ${status.label}`;

  return (
    <PostBoardPost
      value={post.id}
      className={cn(
        "group/card relative flex touch-none flex-col gap-1.5 rounded-md bg-white p-2 text-left shadow-xs ring-1 ring-neutral-950/5 transition-[box-shadow,opacity] select-none",
        "hover:shadow-md hover:ring-neutral-950/10 focus-within:ring-2 focus-within:ring-ring",
        "data-moving:ring-2 data-moving:ring-primary/60 data-dragging:opacity-40"
      )}
    >
      <Link
        href={href}
        draggable={false}
        aria-label={label}
        className="flex min-w-0 flex-col gap-1.5 no-underline outline-none after:absolute after:inset-0 after:rounded-md"
      >
        <span className="flex items-center gap-1.5">
          <PlatformBadge platform={post.platform} size={20} />
          <span className="text-[11px] font-medium text-neutral-500">
            {formatTime(post.time)}
          </span>
          <span
            className={cn("mr-5 ml-auto size-2 rounded-full", status.dot)}
            aria-hidden
          />
        </span>
        <span className="line-clamp-2 text-xs leading-snug text-neutral-800">
          {post.preview || (
            <span className="text-neutral-400 italic">Empty post</span>
          )}
        </span>
      </Link>
      <EditingAvatars postId={post.id} size={18} className="mt-0.5" />

      <Tooltip>
        <TooltipTrigger
          render={
            <PostBoardHandle
              value={post.id}
              aria-label={`Move ${label}`}
              className="absolute top-1.5 right-1.5 z-10 flex size-5 cursor-grab items-center justify-center rounded text-neutral-400 opacity-0 transition-opacity outline-none group-hover/card:opacity-100 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing group-data-moving/card:opacity-100"
            />
          }
        >
          <GripVerticalIcon className="size-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent>
          Space picks up, arrows move, Space drops
        </TooltipContent>
      </Tooltip>
    </PostBoardPost>
  );
}
