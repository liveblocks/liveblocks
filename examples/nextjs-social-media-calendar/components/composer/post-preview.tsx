"use client";

import {
  BookmarkIcon,
  HeartIcon,
  MessageCircleIcon,
  Repeat2Icon,
  SendIcon,
  Share2Icon,
  ThumbsUpIcon,
} from "lucide-react";
import { PROJECT_NAME } from "@/components/brand";
import { formatShortDate, formatTime, parseDateKey } from "@/lib/dates";
import { PLATFORM_INFO, PlatformIcon, type Platform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

const BRAND_AVATAR_CLASS =
  "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold text-white";

type PostPreviewProps = {
  platform: Platform;
  text: string;
  date: string;
  time: string;
};

/**
 * A lightweight mock of how the post will look on the selected network,
 * updated live as the caption is written.
 */
export function PostPreview({ platform, text, date, time }: PostPreviewProps) {
  const info = PLATFORM_INFO[platform];
  const paragraphs = text.split("\n");
  const isEmpty = text.trim().length === 0;
  const when = `${formatShortDate(parseDateKey(date))} · ${formatTime(time)}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-950/5 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">Preview</h2>
        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
          <PlatformIcon platform={platform} width={12} height={12} />
          {info.label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50/70 p-4">
        <article
          className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-950/5"
          aria-label={`${info.label} post preview`}
        >
          <header className="flex items-center gap-3 px-4 pt-4">
            <span className={cn(BRAND_AVATAR_CLASS, "size-10")}>
              {PROJECT_NAME.charAt(0)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {platform === "linkedin" || platform === "facebook"
                  ? PROJECT_NAME
                  : info.handle}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {platform === "linkedin"
                  ? "1,204 followers · Promoted"
                  : platform === "facebook"
                    ? `${when} · 🌐`
                    : platform === "x"
                      ? `${PROJECT_NAME} · ${when}`
                      : when}
              </p>
            </div>
            <span
              className="flex size-7 items-center justify-center rounded-full"
              style={{ background: info.background, color: info.color }}
            >
              <PlatformIcon platform={platform} width={14} height={14} />
            </span>
          </header>

          <div className="px-4 py-3">
            {isEmpty ? (
              <p className="text-sm text-neutral-400 italic">
                Your caption will appear here as you type.
              </p>
            ) : (
              <div className="space-y-2 text-sm leading-relaxed text-neutral-900 break-words whitespace-pre-wrap">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className={paragraph ? undefined : "h-2"}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>

          {(platform === "instagram" || platform === "tiktok") && (
            <div
              className="mx-4 mb-3 flex aspect-[4/5] items-center justify-center rounded-lg text-xs font-medium text-white/80"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.62 0.2 300), oklch(0.7 0.18 20))",
              }}
            >
              Media placeholder
            </div>
          )}

          <footer className="flex items-center gap-5 border-t border-neutral-950/5 px-4 py-3 text-neutral-500">
            {platform === "linkedin" || platform === "facebook" ? (
              <>
                <ThumbsUpIcon className="size-4" />
                <MessageCircleIcon className="size-4" />
                <Repeat2Icon className="size-4" />
                <SendIcon className="ml-auto size-4" />
              </>
            ) : platform === "x" ? (
              <>
                <MessageCircleIcon className="size-4" />
                <Repeat2Icon className="size-4" />
                <HeartIcon className="size-4" />
                <Share2Icon className="ml-auto size-4" />
              </>
            ) : (
              <>
                <HeartIcon className="size-4" />
                <MessageCircleIcon className="size-4" />
                <SendIcon className="size-4" />
                <BookmarkIcon className="ml-auto size-4" />
              </>
            )}
          </footer>
        </article>

        <p className="mx-auto mt-3 max-w-sm text-center text-[11px] text-neutral-400">
          Scheduled for {when}
        </p>
      </div>
    </div>
  );
}
