import type { ReactNode } from "react";
import { BrandAvatar, PROJECT_NAME } from "@/components/brand";
import { PLATFORM_INFO, type Platform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

type PostFrameProps = {
  /** The network the post is previewed on. */
  platform: Platform;
  /** The caption editor. */
  body: ReactNode;
  /** Attached photos and videos. */
  media: ReactNode;
  /** The preview card of the last link, if any. */
  link: ReactNode;
  /** The composer's own controls: add media, character count. */
  footer: ReactNode;
};

/**
 * Lays the post out the way the chosen network shows it, so the composer
 * reads as the post it will become: the microblogs (X, Threads, Bluesky,
 * Mastodon) as a single column with the byline inline, LinkedIn as a card
 * with a header. The editable parts are the same in each; only the frame
 * changes.
 *
 * One component with one element tree for every network, varying only in
 * classes: the editor (and the post room it joins) sits at the same place in
 * the tree whichever platform is previewed, so switching never remounts it.
 * A grid does the layout: avatar in the first column, the byline beside it,
 * and the content either under the byline (microblogs) or across both
 * columns (LinkedIn).
 */
export function PostFrame({
  platform,
  body,
  media,
  link,
  footer,
}: PostFrameProps) {
  const info = PLATFORM_INFO[platform];
  const linkedin = platform === "linkedin";
  const threads = platform === "threads";
  const mastodon = platform === "mastodon";

  return (
    <article
      className={cn(
        "mx-auto my-4 grid w-full max-w-[600px] grid-cols-[auto_1fr] gap-x-3 sm:my-8",
        // LinkedIn shows posts as cards; the microblogs lay them on the feed.
        linkedin && "rounded-xl bg-white p-4 ring-1 ring-neutral-950/10"
      )}
      aria-label="Post"
    >
      <BrandAvatar className={cn(linkedin && "size-11 rounded-md text-sm")} />
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-1 self-center text-sm leading-6",
          (linkedin || mastodon) && "flex-col items-start gap-x-0 leading-5"
        )}
        data-slot="byline"
      >
        <span
          className={cn(
            "font-bold text-neutral-900",
            linkedin && "font-semibold"
          )}
        >
          {threads ? info.handle.replace(/^@/, "") : PROJECT_NAME}
        </span>
        {threads ? null : (
          <span
            className={cn(
              "max-w-full truncate text-neutral-500",
              linkedin && "text-xs"
            )}
          >
            {linkedin ? "Planning content, together" : info.handle}
          </span>
        )}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-3",
          linkedin ? "col-span-2 mt-3" : "col-start-2"
        )}
        data-slot="content"
      >
        {body}
        {media}
        {link}
        {footer}
      </div>
    </article>
  );
}
