import type { CSSProperties } from "react";
import { FRAME_COUNT, type VideoAsset } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * One thumbnail from a video's frame strip, cropped to fill its box. The
 * strip is a single image with the frames side by side, so this is just a
 * background position.
 */
export function FilmstripFrame({
  asset,
  index,
  className,
  style,
}: {
  asset: VideoAsset;
  index: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn("bg-neutral-800 bg-no-repeat", className)}
      style={{
        backgroundImage: `url(${asset.frames})`,
        backgroundSize: `${FRAME_COUNT * 100}% 100%`,
        backgroundPosition: `${(index / (FRAME_COUNT - 1)) * 100}% 0`,
        ...style,
      }}
    />
  );
}
