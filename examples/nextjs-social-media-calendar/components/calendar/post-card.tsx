"use client";

import type { LiveFileData } from "@liveblocks/client";
import { useFileUrl } from "@liveblocks/react";
import { GripVerticalIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { EditingAvatars } from "@/components/editing-avatars";
import { PreviewImage } from "@/components/preview-image";
import { TagChips } from "@/components/tag-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLinkPreview } from "@/hooks/use-link-preview";
import { formatTime } from "@/lib/dates";
import { describePlatforms, PlatformBadges } from "@/lib/platforms";
import type { PostData } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { PostBoardHandle, PostBoardPost } from "./post-board";

const CARD_LAYOUT_CLASS = "flex flex-col gap-1.5 rounded-md p-2 text-left";

/**
 * A post on the calendar. The card is the board's draggable item and a link
 * to the composer at once: a pointer can drag it anywhere (the board captures
 * the pointer on this element, so a plain click still follows the link). The
 * keyboard picks it up from a handle that's only visible while it has
 * keyboard focus, so nothing sits on the card for pointer users. ui-sdk
 * follows a pointer drag with a copy of the card, so it looks the same at
 * rest and in flight.
 */
export function PostCard({ post, href }: { post: PostData; href: string }) {
  const label = `${describePlatforms(post.platforms)} post at ${formatTime(post.time)}`;

  return (
    <div className="group/card relative">
      <PostBoardPost
        value={post.id}
        render={<Link href={href} draggable={false} />}
        aria-label={label}
        className={cn(
          CARD_LAYOUT_CLASS,
          "touch-none bg-white no-underline shadow-md shadow-neutral-950/8 ring-1 ring-neutral-950/5 transition-[box-shadow,opacity] outline-none select-none",
          "hover:shadow-lg hover:shadow-neutral-950/10 hover:ring-neutral-950/10 focus-visible:ring-2 focus-visible:ring-ring",
          "data-moving:ring-2 data-moving:ring-primary/60 data-dragging:opacity-40"
        )}
      >
        <PostCardContent post={post} />
        <EditingAvatars postId={post.id} size={18} className="mt-0.5" />
      </PostBoardPost>

      <Tooltip>
        <TooltipTrigger
          render={
            <PostBoardHandle
              value={post.id}
              aria-label={`Move ${label}`}
              className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded bg-white text-neutral-500 opacity-0 transition-opacity outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
            />
          }
        >
          <GripVerticalIcon className="size-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent>
          Space picks up, arrows move, Space drops
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * Marks where a post sat before it was picked up: a faded, dashed copy of
 * the card, shown in its original day while the post is over another one.
 * Not interactive; the post itself renders where it currently hovers. Its
 * dashed edge is an outline, not a border, and it renders the same children
 * as the card, so it takes exactly the card's size and nothing shifts when
 * the two swap places.
 */
export function PostCardGhost({ post }: { post: PostData }) {
  return (
    <div
      aria-hidden
      data-slot="post-card-ghost"
      className={cn(
        CARD_LAYOUT_CLASS,
        "pointer-events-none bg-neutral-50 opacity-60 outline-1 -outline-offset-1 outline-neutral-300 outline-dashed grayscale select-none"
      )}
    >
      <PostCardContent post={post} />
      <EditingAvatars postId={post.id} size={18} className="mt-0.5" />
    </div>
  );
}

/** What a card shows: platform, time, a thumbnail if any, one line of text. */
function PostCardContent({ post }: { post: PostData }) {
  return (
    <>
      <span className="flex items-center justify-between gap-1.5">
        <PlatformBadges platforms={post.platforms} size={20} />
        {/* Gives way to the move handle while that has keyboard focus. */}
        <span className="text-[11px] font-medium text-neutral-500 tabular-nums transition-opacity group-has-[[data-slot=post-board-handle]:focus-visible]/card:opacity-0">
          {formatTime(post.time)}
        </span>
      </span>
      {post.media?.[0] ? (
        <MediaThumbnail file={post.media[0]} />
      ) : post.linkUrl ? (
        <LinkThumbnail url={post.linkUrl} />
      ) : null}
      <span className="truncate text-xs leading-snug text-neutral-800">
        {post.preview || (
          <span className="text-neutral-400 italic">Empty post</span>
        )}
      </span>
      <TagChips tags={post.tags} max={2} size="xs" />
    </>
  );
}

// Cards stay short: images are cropped to a strip rather than shown whole.
// `pointer-events-none` and `draggable={false}` keep the browser from
// starting its own image drag, which would cut the card's pointer drag short.
const THUMBNAIL_CLASS =
  "pointer-events-none relative block h-18 w-full overflow-hidden rounded bg-neutral-100 select-none";

/**
 * The post's first photo or video, from the LiveFile stored on the post.
 * Non-suspense `useFileUrl`, so the card renders (and can be dragged) while
 * the URL loads.
 */
function MediaThumbnail({ file }: { file: LiveFileData }) {
  const { url } = useFileUrl(file);
  const isVideo = file.mimeType.startsWith("video/");

  return (
    <span className={THUMBNAIL_CLASS}>
      {url ? (
        isVideo ? (
          <video
            src={url}
            muted
            playsInline
            preload="metadata"
            draggable={false}
            className="size-full object-cover"
            aria-label={file.name}
          />
        ) : (
          <PreviewImage src={url} draggable={false} className="size-full" />
        )
      ) : (
        <PreviewImage src={undefined} className="size-full" />
      )}
      {isVideo ? (
        <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-neutral-900/70 text-white">
          <PlayIcon className="size-2.5 fill-current" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

/**
 * For a post without media of its own: the Open Graph image of the last
 * link in its text, as the network would show it (read from the page's Open
 * Graph tags by the `getLinkPreview` action). A placeholder of the same size
 * while the page and then the image load, so the card doesn't grow when it
 * arrives; nothing once the page is known to have no image.
 */
function LinkThumbnail({ url }: { url: string }) {
  const { metadata, isLoading } = useLinkPreview(url);
  const image = metadata?.image ?? undefined;
  if (!image && !isLoading) {
    return null;
  }
  return (
    <span className={THUMBNAIL_CLASS}>
      <PreviewImage src={image} draggable={false} className="size-full" />
    </span>
  );
}
