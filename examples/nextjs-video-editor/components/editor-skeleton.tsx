/** The editor's layout, empty, while the room connects. */
export function EditorSkeleton() {
  return (
    <div
      className="flex h-dvh flex-col px-2 pb-2"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-1">
        <div className="size-7 rounded-lg bg-neutral-950" />
        <div className="h-3.5 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="ml-auto flex gap-1.5">
          <div className="size-7 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-7 w-16 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="panel hidden w-64 shrink-0 lg:block xl:w-72" />
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="stage-backdrop flex-1" />
          <div className="h-12 border-t border-neutral-950/6" />
        </div>
        <div className="panel hidden w-72 shrink-0 lg:block xl:w-80" />
      </div>
      <div className="h-2 shrink-0" />
      <div className="panel h-[300px] shrink-0" />
    </div>
  );
}
