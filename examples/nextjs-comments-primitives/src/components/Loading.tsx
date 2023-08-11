export function Loading() {
  return (
    <div className="absolute flex h-screen w-screen place-content-center items-center">
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        className="h-16 w-16 opacity-20"
      />
    </div>
  );
}
