/** The editor's frame, shown while the plan loads from Liveblocks. */
export function Loading() {
  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-ink sm:gap-1.5 sm:p-1.5">
      <div className="hidden w-[216px] shrink-0 sm:block lg:w-[272px]" />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface sm:card">
        <div className="h-12 shrink-0 border-b border-line" />
        <div
          className="flex flex-1 items-center justify-center"
          role="status"
          aria-label="Loading plan"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5 animate-spin text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        </div>
      </main>
    </div>
  );
}
