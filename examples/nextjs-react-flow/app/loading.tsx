export default function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        width={64}
        height={64}
        className="h-16 w-16 opacity-20"
      />
    </div>
  );
}
