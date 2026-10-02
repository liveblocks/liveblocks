import clsx from "clsx";

export function UnreadBadge({
  count,
  color = "red",
  className,
}: {
  count: number;
  color?: "red" | "brand";
  className?: string;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={clsx(
        "flex h-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums text-white",
        color === "red" ? "bg-red-500" : "bg-brand-500",
        className
      )}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
