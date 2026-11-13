"use client";

import { ChevronDownIcon, PlusIcon, TagIcon } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { findTag, normalizeTag, SUGGESTED_TAGS } from "@/lib/tags";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function TagChip({
  tag,
  className,
}: {
  tag: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-line bg-surface px-1.5 text-[11px] font-medium text-ink-secondary",
        className
      )}
    >
      <TagIcon className="size-3 shrink-0 text-ink-faint" />
      <span className="truncate">{tag}</span>
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
}: {
  value: string[];
  knownTags: string[];
  onChange: (tags: string[]) => void;
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

  return (
    <DropdownMenu onOpenChange={(open) => !open && setDraft("")}>
      <DropdownMenuTrigger
        className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-xs font-medium text-ink-secondary transition-colors hover:border-line-strong hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-hover data-[state=open]:text-ink"
        aria-label="Tags"
      >
        <TagIcon className="size-3.5 text-ink-faint" />
        <span>
          {value.length === 0
            ? "Tags"
            : value.length === 1
              ? value[0]
              : `${value.length} tags`}
        </span>
        <ChevronDownIcon className="size-3 text-ink-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-0">
        <div className="p-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or add a tag…"
            aria-label="Search or add a tag"
            className="h-8 w-full rounded-sm bg-transparent px-2 text-xs text-ink outline-none placeholder:text-ink-faint"
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
              className="text-xs"
            >
              <span className="truncate">{tag}</span>
            </DropdownMenuCheckboxItem>
          ))}
          {canCreate ? (
            <button
              type="button"
              onClick={create}
              className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-xs text-ink hover:bg-hover"
            >
              <PlusIcon className="size-3.5 text-ink-muted" />
              <span className="truncate">
                Create “{query}”
              </span>
            </button>
          ) : null}
          {filtered.length === 0 && !canCreate ? (
            <div className="px-2 py-2 text-xs text-ink-muted">No tags</div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
