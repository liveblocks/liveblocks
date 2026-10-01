import clsx from "clsx";

export function Avatar({
  user,
  size,
  online,
  className,
  ringClassName = "border-white",
}: {
  user: Liveblocks["UserMeta"] | undefined;
  size: "sm" | "lg";
  // When set, draws a presence dot in the corner
  online?: boolean;
  className?: string;
  // Border colour of the presence dot; should match the background behind it
  ringClassName?: string;
}) {
  return (
    <span
      className={clsx(
        "relative inline-block shrink-0 overflow-visible bg-neutral-200",
        size === "sm"
          ? "size-5 min-h-5 min-w-5 rounded"
          : "size-9 min-h-9 min-w-9 rounded-md",
        className
      )}
    >
      <img
        src={user?.info.avatar}
        alt=""
        className={clsx(
          "size-full object-cover",
          size === "sm" ? "rounded" : "rounded-md"
        )}
      />
      {online !== undefined ? (
        <span
          className={clsx(
            // Same transition as the row background, so the ring recolours in step
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 transition",
            size === "sm" ? "size-2.5" : "size-3",
            ringClassName,
            online ? "bg-green-500" : "bg-neutral-400"
          )}
          aria-label={online ? "Online" : "Offline"}
        />
      ) : null}
    </span>
  );
}
