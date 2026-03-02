export function Loading() {
  return (
    <div className="absolute inset-0 w-screen h-screen flex place-content-center place-items-center">
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        className="w-16 h-16 opacity-20 dark:invert"
      />
    </div>
  );
}
