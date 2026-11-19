import { cn } from "@/lib/utils";

export const PROJECT_NAME = "Liveblocks";

/** Logo mark and name. The name hides when the sidebar collapses to icons. */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-black text-white"
        aria-hidden
      >
        <LiveblocksMark className="w-[55%]" />
      </span>
      <div className="hidden leading-tight xl:block">
        <p className="text-sm font-semibold text-neutral-900">{PROJECT_NAME}</p>
        <p className="text-[11px] text-neutral-500">Social calendar</p>
      </div>
    </div>
  );
}

/** The Liveblocks logo mark, filling its box, in the current text color. */
export function LiveblocksMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="768 320 264 160"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M954 320H768L821 376V453L954 320ZM847 480H1032L979 424V347L847 480Z"
      />
    </svg>
  );
}

/**
 * The project's avatar, as it would appear next to one of its posts: the
 * Liveblocks mark in white on black, like the account's real profile picture.
 */
export function BrandAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white",
        className
      )}
      aria-hidden
    >
      <LiveblocksMark className="w-[55%]" />
    </span>
  );
}
