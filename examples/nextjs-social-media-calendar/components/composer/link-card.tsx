"use client";

import { LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PreviewImage } from "@/components/preview-image";
import { useLinkPreview } from "@/hooks/use-link-preview";
import { displayHost } from "@/lib/urls";

// Wait for the URL to stop changing before asking for its metadata, so a link
// being typed doesn't trigger a request per keystroke.
const SETTLE_DELAY_MS = 600;

function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return settled;
}

/**
 * The preview card a network shows under a post that contains a link: the
 * page's image, title, description, and host. The page's Open Graph tags are
 * read on the server by the `getLinkPreview` action, so nothing is scraped in
 * the browser.
 */
export function LinkCard({ url }: { url: string }) {
  const settledUrl = useSettledValue(url, SETTLE_DELAY_MS);
  return <SettledLinkCard key={settledUrl} url={settledUrl} />;
}

// Open Graph images are 1.91:1, the size networks show them at.
const IMAGE_CLASS = "aspect-[1.91/1] w-full";

function SettledLinkCard({ url }: { url: string }) {
  const { metadata, isLoading, error } = useLinkPreview(url);
  const host = displayHost(url);

  // While the page loads, a card the size of the one most links get: an
  // image-sized block over two lines of text. Then, while the image itself
  // downloads, `PreviewImage` holds its place at the same aspect ratio.
  if (isLoading) {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-neutral-950/10"
        aria-busy
        aria-label={`Loading a preview of ${host}`}
      >
        <PreviewImage src={undefined} className={IMAGE_CLASS} />
        <div className="space-y-2 p-3">
          <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    );
  }

  // Pages that can't be fetched or carry no metadata still get a plain card
  // naming the link, like networks do.
  const title = error ? undefined : metadata?.title?.trim();
  const description = error ? undefined : metadata?.description?.trim();
  const image = error ? undefined : (metadata?.image ?? undefined);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="block overflow-hidden rounded-2xl border border-neutral-950/10 text-left no-underline transition-colors outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${title ?? host} (opens in a new tab)`}
    >
      {image ? <PreviewImage src={image} className={IMAGE_CLASS} /> : null}
      <div className="flex items-center gap-3 p-3">
        {image ? null : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
            <LinkIcon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <p className="truncate text-neutral-500">{host}</p>
          {title ? (
            <p className="truncate font-medium text-neutral-900">{title}</p>
          ) : null}
          {description ? (
            <p className="line-clamp-2 text-neutral-500">{description}</p>
          ) : null}
        </div>
      </div>
    </a>
  );
}
