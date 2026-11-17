"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type PreviewImageProps = Omit<ComponentProps<"img">, "src"> & {
  /** The image to show, or nothing while it's still unknown. */
  src: string | undefined;
};

// Every image URL that has finished loading somewhere on the page. A card
// that remounts with one of these (the in-flight card landing in another day,
// the ghost left where it was picked up) shows it at once, with no
// placeholder or fade: the browser has it cached, and a fade there would
// look like a flicker.
const loadedSources = new Set<string>();

/**
 * An image that holds its place before it shows: the wrapper has the final
 * size (from `className`) and a pulsing gray fill until the image has both a
 * URL and finished downloading, so cards and previews don't grow when it
 * arrives. The same component on the calendar cards and in the composer.
 */
export function PreviewImage({
  src,
  className,
  alt = "",
  onLoad,
  onError,
  ...props
}: PreviewImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const loaded =
    src !== undefined && (loadedSrc === src || loadedSources.has(src));

  return (
    <span
      className={cn(
        "relative block overflow-hidden bg-neutral-100",
        !loaded && "animate-pulse",
        className
      )}
      aria-busy={!loaded || undefined}
    >
      {src ? (
        // Remote OG images and presigned file URLs: plain <img>, not
        // next/image (unknown hosts).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...props}
          src={src}
          alt={alt}
          onLoad={(event) => {
            loadedSources.add(src);
            setLoadedSrc(src);
            onLoad?.(event);
          }}
          onError={(event) => {
            // A broken image still ends the pulse: nothing more is coming.
            setLoadedSrc(src);
            onError?.(event);
          }}
          className={cn(
            "size-full object-cover",
            loaded ? "opacity-100" : "opacity-0",
            // Only fade when the image is actually arriving; one already seen
            // (e.g. a dragged card's copy) is shown instantly.
            !loadedSources.has(src) && "transition-opacity"
          )}
        />
      ) : null}
    </span>
  );
}
