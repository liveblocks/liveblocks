import { SpinnerIcon } from "@liveblocks/react-ui/_private";

export default function Loading() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background text-sm">
      <SpinnerIcon className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
