import { cn } from "@/lib/utils";

/** Logo mark and name. */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-neutral-900">Liveblocks</p>
        <p className="text-[11px] text-neutral-500">Podcast studio</p>
      </div>
    </div>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-black text-white",
        className
      )}
      aria-hidden
    >
      <svg viewBox="768 320 264 160" fill="currentColor" className="w-[55%]">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M954 320H768L821 376V453L954 320ZM847 480H1032L979 424V347L847 480Z"
        />
      </svg>
    </span>
  );
}

/** The show's cover art: a gradient tile with a waveform glyph. */
export function CoverArt({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-end overflow-hidden rounded-lg bg-[linear-gradient(135deg,oklch(0.55_0.23_285),oklch(0.62_0.2_340)_60%,oklch(0.78_0.16_60))] p-1.5 text-white shadow-sm ring-1 ring-neutral-950/10",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 12"
        className="absolute top-2 left-1/2 w-[62%] -translate-x-1/2 opacity-90"
      >
        {[3, 7, 11, 5, 9, 4, 8, 2].map((height, index) => (
          <rect
            key={index}
            x={index * 3 + 0.5}
            y={(12 - height) / 2}
            width="1.6"
            height={height}
            rx="0.8"
            fill="currentColor"
          />
        ))}
      </svg>
      <span className="relative text-[8px] leading-none font-bold tracking-wider uppercase">
        Latency
      </span>
    </span>
  );
}
