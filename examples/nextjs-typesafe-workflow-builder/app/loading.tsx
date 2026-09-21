import { Loader2, Workflow } from "lucide-react";

export default function Loading() {
  return (
    <div
      className="workflow-loading flex h-dvh flex-col items-center justify-center gap-3"
      role="status"
    >
      <span className="brand-mark !size-9 !rounded-xl">
        <Workflow className="size-5" aria-hidden />
      </span>
      <div className="text-center">
        <p className="text-sm font-semibold tracking-tight text-neutral-800">
          Opening your workspace
        </p>
        <p className="mt-2 flex items-center justify-center gap-2 text-xs text-neutral-500">
          <Loader2 className="size-3 animate-spin" aria-hidden /> Connecting…
        </p>
      </div>
    </div>
  );
}
