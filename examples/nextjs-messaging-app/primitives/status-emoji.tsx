import clsx from "clsx";
import type { UserStatus } from "@/lib/status";

export function StatusEmoji({
  status,
  size = "md",
  className,
}: {
  status: UserStatus | undefined;
  size?: "md" | "lg";
  className?: string;
}) {
  if (!status?.emoji) {
    return null;
  }

  return (
    <span
      className={clsx("group/status relative inline-flex shrink-0", className)}
      role="img"
      aria-label={status.text ? `Status: ${status.text}` : "Status"}
    >
      <span
        className={clsx(
          "leading-none",
          size === "lg" ? "text-xl" : "text-base"
        )}
        aria-hidden
      >
        {status.emoji}
      </span>
      {status.text ? (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 flex-col items-center opacity-0 transition-opacity group-hover/status:opacity-100"
          aria-hidden
        >
          <span className="max-w-64 truncate rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-lg">
            {status.text}
          </span>
          <span className="-mt-px size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-neutral-900" />
        </span>
      ) : null}
    </span>
  );
}
