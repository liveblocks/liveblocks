import {
  BookmarkIcon,
  HeartIcon,
  MessageCircleIcon,
  Repeat2Icon,
  SendIcon,
  Share2Icon,
  ThumbsUpIcon,
} from "lucide-react";
import type { Platform } from "@/lib/platforms";

/**
 * The row of reactions under a post on the selected network. Decorative: it
 * makes the composer read as the post it will become.
 */
export function PostActions({ platform }: { platform: Platform }) {
  return (
    <div
      className="flex items-center gap-6 px-4 py-2 text-neutral-400 [&_svg]:size-[18px]"
      aria-hidden
    >
      {platform === "linkedin" || platform === "facebook" ? (
        <>
          <ThumbsUpIcon />
          <MessageCircleIcon />
          <Repeat2Icon />
          <SendIcon className="ml-auto" />
        </>
      ) : platform === "x" ? (
        <>
          <MessageCircleIcon />
          <Repeat2Icon />
          <HeartIcon />
          <Share2Icon className="ml-auto" />
        </>
      ) : (
        <>
          <HeartIcon />
          <MessageCircleIcon />
          <SendIcon />
          <BookmarkIcon className="ml-auto" />
        </>
      )}
    </div>
  );
}
