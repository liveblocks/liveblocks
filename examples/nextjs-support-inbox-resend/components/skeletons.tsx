import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

function Bone({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse rounded bg-ink/6", className)}
      style={style}
      aria-hidden
    />
  );
}

// Full-page placeholder while the room and its feeds load.
export function InboxSkeleton() {
  return (
    <div
      className="flex h-dvh bg-canvas md:gap-1.5 md:p-1.5"
      aria-busy
      aria-label="Loading inbox"
    >
      {/* Sidebar: icon rail below `lg`, full width above (see Sidebar). */}
      <div className="hidden w-8 shrink-0 flex-col items-center gap-2 pt-px pb-2 md:flex lg:w-[220px] lg:items-stretch lg:px-2 lg:pt-3">
        <Bone className="mb-3 size-7 lg:h-10 lg:w-full" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Bone key={index} className="size-7 lg:h-8 lg:w-full" />
        ))}
      </div>
      {/* Conversation list: header rows are 28 / 32 / 24px like the real one
          (title, search, filter+sort), so the header is 131px tall. */}
      <div className="flex w-full shrink-0 flex-col bg-surface md:card md:w-[340px] xl:w-[380px]">
        <div className="flex flex-col gap-2.5 border-b border-line px-4 pt-3.5 pb-3">
          <div className="flex h-7 items-center">
            <Bone className="h-3.5 w-16" />
          </div>
          <Bone className="h-8 rounded-md" />
          <div className="flex h-6 items-center justify-between">
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-24" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="border-b border-line px-4 py-3">
            <div className="flex h-5 items-center gap-2">
              <Bone className="size-5 rounded-full" />
              <Bone className="h-3 w-1/3" />
            </div>
            <div className="mt-1.5 flex h-5 items-center">
              <Bone className="h-3 w-4/5" />
            </div>
            <div className="mt-0.5 flex h-4 items-center">
              <Bone className="h-2.5 w-full" />
            </div>
            <div className="mt-2 flex h-5 items-center justify-between">
              <Bone className="h-3 w-14" />
              <Bone className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
      {/* Thread: 40px title row + 48px meta row, 89px with the border. */}
      <div className="hidden min-w-0 flex-1 flex-col bg-surface md:card md:flex">
        <div className="border-b border-line">
          <div className="flex h-10 items-center pl-4 pr-2.5 pt-3">
            <Bone className="h-3.5 w-1/3" />
          </div>
          <div className="flex items-center justify-between gap-4 pl-4 pr-2.5 pt-2 pb-3">
            <div className="flex h-7 items-center gap-2">
              <Bone className="size-5 rounded-full" />
              <Bone className="h-3 w-24" />
              <Bone className="h-3 w-40" />
            </div>
            <div className="flex h-7 items-center gap-3">
              <Bone className="h-3 w-16" />
              <Bone className="h-3 w-20" />
              <Bone className="size-4" />
            </div>
          </div>
        </div>
        <TimelineSkeleton />
      </div>
      {/* Details panel, docked from `xl` (open by default). It sits on the
          canvas, not in a card; the measurements mirror CustomerPanel. */}
      <div className="hidden w-[320px] shrink-0 flex-col xl:flex">
        <div className="px-3 pt-3 pb-5">
          <div className="flex items-center gap-3">
            <Bone className="size-10 rounded-full" />
            <div className="flex-1">
              <div className="flex h-5 items-center">
                <Bone className="h-3.5 w-28" />
              </div>
              <div className="flex h-4 items-center">
                <Bone className="h-3 w-20" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            {[44, 32].map((width) => (
              <div key={width} className="flex h-4 items-center gap-2">
                <Bone className="size-3.5 rounded-sm" />
                <Bone className="h-3" style={{ width: `${width}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="mx-3 h-px bg-line" />
        <div className="px-3 py-5">
          <div className="mb-3 flex h-4 items-center">
            <Bone className="h-3 w-11" />
          </div>
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
            {[
              [40, 56],
              [44, 40],
              [52, 72],
              [28, 64],
              [44, 80],
              [68, 80],
            ].map(([label, value], index) => (
              <div key={index} className="contents">
                <div className="flex h-7 items-center">
                  <Bone className="h-3" style={{ width: label }} />
                </div>
                <div className="flex h-7 items-center">
                  <Bone className="h-3" style={{ width: value }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="flex-1 overflow-hidden" aria-busy aria-label="Loading messages">
      <div className="mx-auto w-full max-w-[760px] space-y-4 px-4 pt-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex gap-3 rounded-lg bg-canvas p-4">
            <Bone className="size-9 rounded-full" />
            <div className="flex-1 space-y-2.5">
              <div className="flex justify-between">
                <Bone className="h-3 w-1/3" />
                <Bone className="h-3 w-16" />
              </div>
              <Bone className="h-3 w-1/4" />
              <Bone className="mt-4 h-3 w-full" />
              <Bone className="h-3 w-11/12" />
              <Bone className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
