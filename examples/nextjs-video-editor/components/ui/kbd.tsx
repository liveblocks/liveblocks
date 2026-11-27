import { cn } from "@/lib/utils";

/** A keyboard shortcut hint, sized for tooltips. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-white/15 px-1 font-sans text-[11px] font-medium text-current/80",
        className
      )}
      {...props}
    />
  );
}
