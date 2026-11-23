import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-ink/6", className)}
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
      <div className="flex w-full shrink-0 flex-col bg-surface md:card md:w-[340px] xl:w-[380px]">
        <div className="flex flex-col gap-2.5 border-b border-line px-4 pt-3.5 pb-3">
          <Bone className="h-5 w-24" />
          <Bone className="h-8" />
          <Bone className="h-5 w-40" />
        </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <Bone className="size-5 rounded-full" />
              <Bone className="h-3 w-1/3" />
            </div>
            <Bone className="h-3 w-4/5" />
            <Bone className="h-3 w-full" />
            <div className="flex justify-between pt-1">
              <Bone className="h-3 w-12" />
              <Bone className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden min-w-0 flex-1 flex-col bg-surface md:card md:flex">
        <div className="border-b border-line px-6 py-4">
          <Bone className="h-4 w-1/3" />
          <Bone className="mt-3 h-4 w-1/4" />
        </div>
        <TimelineSkeleton />
      </div>
      {/* Details panel, docked from `xl` (open by default). */}
      <div className="hidden w-[320px] shrink-0 flex-col bg-surface md:card xl:flex">
        <div className="px-3 pt-3 pb-5">
          <div className="flex items-center gap-3">
            <Bone className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3 w-1/2" />
              <Bone className="h-3 w-3/4" />
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <Bone className="h-3 w-2/3" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
        <div className="mx-3 h-px bg-line" />
        <div className="px-3 py-5">
          <Bone className="mb-4 h-3 w-12" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Bone className="h-3 w-[84px]" />
                <Bone className="h-3 w-24" />
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
