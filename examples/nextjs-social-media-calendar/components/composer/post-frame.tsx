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
 * Mastodon) as a single column with the byline inline, LinkedIn as a header
 * card. The editable parts are the same in each; only the frame changes.
 */
export function PostFrame(props: PostFrameProps) {
  switch (props.platform) {
    case "x":
    case "threads":
    case "bluesky":
    case "mastodon":
      return <MicroblogFrame {...props} platform={props.platform} />;
    case "linkedin":
      return <LinkedInFrame {...props} />;
  }
}

const ARTICLE_CLASS =
  "mx-auto my-4 w-full max-w-[600px] overflow-hidden rounded-xl bg-white shadow ring-1 ring-neutral-950/5 sm:my-8";

type Microblog = Exclude<Platform, "linkedin">;

/**
 * X, Threads, Bluesky, and Mastodon: avatar on the left, the byline inline
 * with the text under it. Threads leads with the handle alone; Mastodon puts
 * its long handle on its own line.
 */
function MicroblogFrame({
  platform,
  body,
  media,
  link,
  footer,
}: Omit<PostFrameProps, "platform"> & { platform: Microblog }) {
  const info = PLATFORM_INFO[platform];
  const stacked = platform === "mastodon";
  const threads = platform === "threads";
  return (
    <article className={cn(ARTICLE_CLASS, "flex gap-3 p-4")} aria-label="Post">
      <BrandAvatar />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-1 text-[15px] leading-6",
            stacked && "flex-col items-start gap-x-0 leading-5"
          )}
        >
          <span className="font-bold text-neutral-900">
            {threads ? info.handle.replace(/^@/, "") : PROJECT_NAME}
          </span>
          {threads ? null : (
            <span className="truncate text-neutral-500">{info.handle}</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {body}
          {media}
          {link}
          {footer}
        </div>
      </div>
    </article>
  );
}

/** LinkedIn: a header card, then the text. */
function LinkedInFrame({ body, media, link, footer }: PostFrameProps) {
  return (
    <article className={cn(ARTICLE_CLASS, "p-4")} aria-label="Post">
      <header className="flex items-center gap-3">
        <BrandAvatar className="size-12 rounded-md text-base" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[15px] font-semibold text-neutral-900">
            {PROJECT_NAME}
          </p>
          <p className="truncate text-xs text-neutral-500">
            Planning content, together
          </p>
        </div>
      </header>
      <div className="mt-3 flex flex-col gap-3">
        {body}
        {media}
        {link}
        {footer}
      </div>
    </article>
  );
}
