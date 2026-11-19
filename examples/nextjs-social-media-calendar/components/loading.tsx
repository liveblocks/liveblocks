import { Loader2Icon } from "lucide-react";

export function Loading() {
  return (
    <div className="flex h-dvh w-full items-center justify-center text-neutral-400">
      <Loader2Icon className="size-5 animate-spin" />
    </div>
  );
}
