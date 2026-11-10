"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { EditingAvatars } from "@/components/editing-avatars";
import { formatTime } from "@/lib/dates";
import { PLATFORM_INFO, PlatformBadge } from "@/lib/platforms";
import { STATUS_INFO, type PostData } from "@/lib/posts";
import { cn } from "@/lib/utils";

/**
 * Presentational card, shared between the calendar grid and the drag
 * overlay so the dragged card looks identical to the one at rest.
 */
export function PostCardContent({
  post,
  className,
  dragging = false,
}: {
  post: PostData;
  className?: string;
  dragging?: boolean;
}) {
  const status = STATUS_INFO[post.status];
  const platform = PLATFORM_INFO[post.platform];

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md bg-white p-2 text-left ring-1 ring-neutral-950/5 transition-shadow",
        dragging
          ? "rotate-1 shadow-xl ring-primary/30"
          : "shadow-xs hover:shadow-md hover:ring-neutral-950/10",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <PlatformBadge platform={post.platform} size={20} />
        <span className="text-[11px] font-medium text-neutral-500">
          {formatTime(post.time)}
        </span>
        <span
          className={cn("ml-auto size-2 rounded-full", status.dot)}
          title={`${platform.label} · ${status.label}`}
        />
      </div>
      <p className="line-clamp-2 text-xs leading-snug text-neutral-800">
        {post.preview || (
          <span className="text-neutral-400 italic">Empty post</span>
        )}
      </p>
      <EditingAvatars postId={post.id} size={18} className="mt-0.5" />
    </div>
  );
}

export function DraggablePostCard({
  post,
  href,
}: {
  post: PostData;
  href: string;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Open ${PLATFORM_INFO[post.platform].label} post`}
      className={cn(
        "cursor-grab touch-none outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      // A click (pointer down + up without moving past the sensor's distance
      // constraint) opens the post; moving first starts a drag instead.
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          router.push(href);
        }
      }}
    >
      <PostCardContent post={post} />
    </div>
  );
}
