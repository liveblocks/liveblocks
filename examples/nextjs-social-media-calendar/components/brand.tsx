import { CalendarDaysIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const PROJECT_NAME = "Acme Studio";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
        <CalendarDaysIcon className="size-4" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-neutral-900">{PROJECT_NAME}</p>
        <p className="text-[11px] text-neutral-500">Social calendar</p>
      </div>
    </div>
  );
}

/** The project's avatar, as it would appear next to one of its posts. */
export function BrandAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-semibold text-white",
        className
      )}
      aria-hidden
    >
      {PROJECT_NAME.charAt(0)}
    </span>
  );
}
