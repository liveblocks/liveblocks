export function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        className="size-16 opacity-20 dark:invert"
      />
    </div>
  );
}
