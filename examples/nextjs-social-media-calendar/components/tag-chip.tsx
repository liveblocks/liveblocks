import { TagIcon } from "lucide-react";
import { tagColor } from "@/lib/tags";
import { cn } from "@/lib/utils";

/** A label as shown on a post: a small tinted, bordered chip. */
export function TagChip({
  tag,
  size = "sm",
  className,
}: {
  tag: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md border font-medium whitespace-nowrap",
        size === "xs"
          ? "px-1.5 py-px text-[11px]"
          : size === "md"
            ? "px-2 py-0.5 text-[13px]"
            : "px-2 py-0.5 text-[11px]",
        tagColor(tag),
        className
      )}
    >
      {tag}
    </span>
  );
}

/** Up to `max` labels in a row, then a "+n" for the rest. */
export function TagChips({
  tags,
  max = 3,
  size = "sm",
  className,
}: {
  tags: readonly string[];
  max?: number;
  size?: "xs" | "sm";
  className?: string;
}) {
  if (tags.length === 0) {
    return null;
  }
  const shown = tags.slice(0, max);
  const rest = tags.length - shown.length;
  return (
    <span
      className={cn("flex flex-wrap items-center gap-1", className)}
      aria-label={`Labels: ${tags.join(", ")}`}
    >
      {shown.map((tag) => (
        <TagChip key={tag} tag={tag} size={size} />
      ))}
      {rest > 0 ? (
        <span className="text-[11px] text-neutral-500">+{rest}</span>
      ) : null}
    </span>
  );
}

/**
 * Every label in one chip: a tag icon, the first label, and a "+n" for the
 * rest behind a divider. For rows where a run of chips would be too wide.
 */
export function TagSummary({
  tags,
  className,
}: {
  tags: readonly string[];
  className?: string;
}) {
  if (tags.length === 0) {
    return null;
  }
  const [first, ...rest] = tags;
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tagColor(first),
        className
      )}
      aria-label={`Labels: ${tags.join(", ")}`}
    >
      <TagIcon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{first}</span>
      {rest.length > 0 ? (
        <>
          <span className="h-3 w-px bg-current opacity-30" aria-hidden />
          <span>+{rest.length}</span>
        </>
      ) : null}
    </span>
  );
}
