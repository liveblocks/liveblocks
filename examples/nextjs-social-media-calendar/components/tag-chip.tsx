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
        // Explicit line-height: the drag preview copies the card's computed
        // (px) line-height inline, which the chips would otherwise inherit.
        "inline-flex max-w-full items-center truncate rounded-md border font-medium leading-[1.5] whitespace-nowrap",
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
        <span className="text-[11px] leading-[1.5] text-neutral-500">
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
