"use client";

import { ChevronDownIcon, PlusIcon, TagIcon, XIcon } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { findTag, normalizeTag, SUGGESTED_TAGS } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { triggerClass, type MenuAppearance } from "./status";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function TagChip({
  tag,
  onRemove,
  className,
}: {
  tag: string;
  // When set, the chip gets an × that removes the tag.
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-line bg-surface px-1.5 text-xs text-ink",
        className
      )}
    >
      <TagIcon className="size-3 shrink-0 text-ink-faint" />
      <span className="truncate">{tag}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="-mr-1 flex size-4 shrink-0 items-center justify-center rounded-sm text-ink-faint transition-colors hover:bg-ink/8 hover:text-ink"
          aria-label={`Remove tag ${tag}`}
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function TagList({
  tags,
  max = 3,
  className,
}: {
  tags: string[];
  max?: number;
  className?: string;
}) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const overflow = tags.length - visible.length;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((tag) => (
        <TagChip key={tag} tag={tag} />
      ))}
      {overflow > 0 ? (
        <span
          className="tabular text-[11px] text-ink-faint"
          title={tags.slice(max).join(", ")}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Add or remove tags on a conversation. Offers the suggested tags plus any
 * tag already used in this inbox (`knownTags`), and lets the agent type a new
 * one. Changes are written to feed metadata, so they sync to everyone.
 */
export function TagsMenu({
  value,
  knownTags,
  onChange,
  appearance = "outline",
}: {
  value: string[];
  knownTags: string[];
  onChange: (tags: string[]) => void;
  appearance?: MenuAppearance;
}) {
  const [draft, setDraft] = useState("");

  const options = useMemo(() => {
    const all: string[] = [];
    for (const tag of [...value, ...SUGGESTED_TAGS, ...knownTags]) {
      if (!findTag(all, tag)) all.push(tag);
    }
    return all.sort((a, b) => a.localeCompare(b));
  }, [value, knownTags]);

  const query = normalizeTag(draft);
  const filtered = query
    ? options.filter((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    : options;
  const canCreate = query !== "" && !findTag(options, query);

  const toggle = (tag: string) => {
    const existing = findTag(value, tag);
    onChange(existing ? value.filter((item) => item !== existing) : [...value, tag]);
  };

  const create = () => {
    if (!query) return;
    const existing = findTag(options, query);
    if (existing) {
      if (!findTag(value, existing)) onChange([...value, existing]);
    } else {
      onChange([...value, query]);
    }
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Keep typing inside the input instead of triggering the menu's typeahead.
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      create();
    }
  };

  const summary =
    value.length === 0
      ? "No tags"
      : value.length === 1
        ? value[0]
        : `${value.length} tags`;

  const trigger =
    appearance === "ghost" ? (
      // Chips sit next to the trigger (not inside it) so each can carry its
      // own remove button.
      <div className="flex flex-wrap items-center gap-1 py-0.5">
        {value.map((tag) => (
          <TagChip
            key={tag}
            tag={tag}
            onRemove={() => onChange(value.filter((item) => item !== tag))}
          />
        ))}
        <DropdownMenuTrigger
          className={cn(
            triggerClass.ghost,
            "h-6 text-ink-muted",
            value.length > 0 && "px-1"
          )}
          aria-label={`Tags: ${value.length === 0 ? "none" : value.join(", ")}`}
        >
          {value.length === 0 ? (
            <span>Add tags</span>
          ) : (
            <PlusIcon className="size-3.5" />
          )}
        </DropdownMenuTrigger>
      </div>
    ) : (
      <DropdownMenuTrigger
        className={triggerClass[appearance]}
        aria-label={`Tags: ${value.length === 0 ? "none" : value.join(", ")}`}
      >
        {appearance === "icon" ? (
          <TagIcon
            className={cn("size-4", value.length > 0 ? "text-ink" : "text-ink-muted")}
          />
        ) : (
          <>
            <TagIcon className="size-3.5 text-ink-faint" />
            <span>{value.length === 0 ? "Tags" : summary}</span>
            <ChevronDownIcon className="size-3 text-ink-faint" />
          </>
        )}
      </DropdownMenuTrigger>
    );

  return (
    <DropdownMenu onOpenChange={(open) => !open && setDraft("")}>
      {appearance === "icon" ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {value.length === 0 ? "Add tags" : value.join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent align="end" className="w-60 p-0">
        <div className="p-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or add a tag…"
            aria-label="Search or add a tag"
            className="h-8 w-full rounded bg-transparent px-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
            autoFocus
          />
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="scroll-quiet max-h-64 overflow-y-auto p-1">
          {filtered.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={Boolean(findTag(value, tag))}
              onCheckedChange={() => toggle(tag)}
              onSelect={(event) => event.preventDefault()}
            >
              <span className="truncate">{tag}</span>
            </DropdownMenuCheckboxItem>
          ))}
          {canCreate ? (
            <button
              type="button"
              onClick={create}
              className="flex h-7 w-full items-center gap-2 rounded px-2 text-left text-[13px] text-ink hover:bg-hover"
            >
              <PlusIcon className="size-4 text-ink-muted" />
              <span className="truncate">
                Create “{query}”
              </span>
            </button>
          ) : null}
          {filtered.length === 0 && !canCreate ? (
            <div className="px-2 py-1.5 text-[13px] text-ink-muted">No tags</div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
