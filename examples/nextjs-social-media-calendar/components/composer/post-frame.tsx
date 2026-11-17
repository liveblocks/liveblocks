import {
  BookmarkIcon,
  GlobeIcon,
  HeartIcon,
  MessageCircleIcon,
  MusicIcon,
  Repeat2Icon,
  SendIcon,
  Share2Icon,
  ThumbsUpIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { BrandAvatar, PROJECT_NAME } from "@/components/brand";
import { PLATFORM_INFO, type Platform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

type PostFrameProps = {
  /** The network the post is previewed on. */
  platform: Platform;
  /** The time and date, as editable inputs. */
  meta: ReactNode;
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
 * reads as the post it will become: X's single column with the byline
 * inline, LinkedIn's and Facebook's header card with labeled reactions,
 * Instagram's media-first post with the caption under the actions, TikTok's
 * handle-first caption. The editable parts are the same in each; only the
 * frame changes.
 */
export function PostFrame(props: PostFrameProps) {
  switch (props.platform) {
    case "x":
      return <XFrame {...props} />;
    case "linkedin":
    case "facebook":
      return <FeedFrame {...props} />;
    case "instagram":
      return <InstagramFrame {...props} />;
    case "tiktok":
      return <TikTokFrame {...props} />;
  }
}

const ARTICLE_CLASS =
  "mx-auto my-4 w-full max-w-[600px] overflow-hidden rounded-xl bg-white shadow ring-1 ring-neutral-950/5 sm:my-8";

const ACTIONS_CLASS =
  "flex items-center text-neutral-500 select-none [&_svg]:size-[18px]";

function Dot() {
  return (
    <span className="text-neutral-400" aria-hidden>
      ·
    </span>
  );
}

function XFrame({ meta, body, media, link, footer }: PostFrameProps) {
  const info = PLATFORM_INFO.x;
  return (
    <article className={cn(ARTICLE_CLASS, "flex gap-3 p-4")} aria-label="Post">
      <BrandAvatar />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1 text-[15px] leading-6">
          <span className="font-bold text-neutral-900">{PROJECT_NAME}</span>
          <span className="text-neutral-500">{info.handle}</span>
          <Dot />
          {meta}
        </div>
        <div className="flex flex-col gap-3">
          {body}
          {media}
          {link}
          {footer}
        </div>
        <div
          className={cn(ACTIONS_CLASS, "justify-between px-2 pt-2")}
          aria-hidden
        >
          <MessageCircleIcon />
          <Repeat2Icon />
          <HeartIcon />
          <BookmarkIcon />
          <Share2Icon />
        </div>
      </div>
    </article>
  );
}

/** LinkedIn and Facebook: a header card, then the text, then labeled reactions. */
function FeedFrame({
  platform,
  meta,
  body,
  media,
  link,
  footer,
}: PostFrameProps) {
  const info = PLATFORM_INFO[platform];
  const linkedin = platform === "linkedin";
  return (
    <article className={cn(ARTICLE_CLASS, "p-4")} aria-label="Post">
      <header className="flex items-center gap-3">
        <BrandAvatar
          className={cn("size-12 text-base", linkedin && "rounded-md")}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[15px] font-semibold text-neutral-900">
            {PROJECT_NAME}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {linkedin ? "Planning content, together" : info.handle}
          </p>
          <div className="flex flex-wrap items-center gap-x-1 text-xs text-neutral-500 [&_[data-slot]]:text-xs">
            {meta}
            <Dot />
            <GlobeIcon className="size-3" aria-hidden />
          </div>
        </div>
      </header>
      <div className="mt-3 flex flex-col gap-3">
        {body}
        {media}
        {link}
        {footer}
      </div>
      <div
        className={cn(
          ACTIONS_CLASS,
          "mt-3 justify-around border-t border-neutral-950/5 pt-2 text-[13px] font-medium"
        )}
        aria-hidden
      >
        <Reaction icon={<ThumbsUpIcon />} label="Like" />
        <Reaction icon={<MessageCircleIcon />} label="Comment" />
        <Reaction
          icon={linkedin ? <Repeat2Icon /> : <Share2Icon />}
          label={linkedin ? "Repost" : "Share"}
        />
        {linkedin ? <Reaction icon={<SendIcon />} label="Send" /> : null}
      </div>
    </article>
  );
}

function Reaction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-2 py-1">
      {icon}
      {label}
    </span>
  );
}

/** Instagram: media first, actions, then the caption led by the account name. */
function InstagramFrame({ meta, body, media, link, footer }: PostFrameProps) {
  const info = PLATFORM_INFO.instagram;
  return (
    <article className={ARTICLE_CLASS} aria-label="Post">
      <header className="flex items-center gap-3 px-4 py-3">
        <span className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600 p-0.5">
          <BrandAvatar className="size-8 text-xs ring-2 ring-white" />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 text-sm leading-5">
          <span className="font-semibold text-neutral-900">
            {info.handle.replace(/^@/, "")}
          </span>
          <Dot />
          <span className="flex items-center gap-x-1 text-neutral-500 [&_[data-slot]]:text-sm">
            {meta}
          </span>
        </div>
      </header>
      <div className="px-4 empty:hidden">{media}</div>
      <div className={cn(ACTIONS_CLASS, "gap-4 px-4 py-3")} aria-hidden>
        <HeartIcon />
        <MessageCircleIcon />
        <SendIcon />
        <BookmarkIcon className="ml-auto" />
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="text-sm">
          <span className="mr-1.5 font-semibold text-neutral-900">
            {info.handle.replace(/^@/, "")}
          </span>
          {body}
        </div>
        {link}
        {footer}
      </div>
    </article>
  );
}

/** TikTok: handle first, the caption, a sound line, and the usual reactions. */
function TikTokFrame({ meta, body, media, link, footer }: PostFrameProps) {
  const info = PLATFORM_INFO.tiktok;
  return (
    <article className={cn(ARTICLE_CLASS, "p-4")} aria-label="Post">
      <header className="flex items-center gap-3">
        <BrandAvatar className="size-11" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[15px] font-bold text-neutral-900">
            {info.handle.replace(/^@/, "")}
          </p>
          <div className="flex flex-wrap items-center gap-x-1 text-xs text-neutral-500 [&_[data-slot]]:text-xs">
            <span>{PROJECT_NAME}</span>
            <Dot />
            {meta}
          </div>
        </div>
      </header>
      <div className="mt-3 flex flex-col gap-3">
        {body}
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <MusicIcon className="size-3.5" aria-hidden />
          original sound – {info.handle.replace(/^@/, "")}
        </p>
        {media}
        {link}
        {footer}
      </div>
      <div className={cn(ACTIONS_CLASS, "mt-3 gap-6 px-2")} aria-hidden>
        <HeartIcon />
        <MessageCircleIcon />
        <BookmarkIcon />
        <Share2Icon className="ml-auto" />
      </div>
    </article>
  );
}
