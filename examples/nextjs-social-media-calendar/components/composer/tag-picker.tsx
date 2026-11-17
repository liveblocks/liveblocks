"use client";

import { shallow, useStorage } from "@liveblocks/react/suspense";
import { CheckIcon, PlusIcon, TagIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { TagChip } from "@/components/tag-chip";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeTag, tagColor } from "@/lib/tags";
import { cn } from "@/lib/utils";

type TagPickerProps = {
  tags: readonly string[];
  onTagsChange: (tags: string[]) => void;
};

/**
 * The post's labels as chips, each removable, and a button that opens a
 * popover to pick labels already used in the project or type a new one.
 * Labels live on the post in the project room, so the calendar and list
 * show them without joining the post's room.
 */
export function TagPicker({ tags, onTagsChange }: TagPickerProps) {
  const [query, setQuery] = useState("");

  // Every label in use across the project, so people reuse the same names.
  const projectTags = useStorage(
    (root) =>
      Array.from(
        new Set(Object.values(root.posts).flatMap((post) => post.tags ?? []))
      ).sort((a, b) => a.localeCompare(b)),
    shallow
  );

  const typed = normalizeTag(query);
  const matching = projectTags.filter((tag) =>
    tag.toLowerCase().includes(typed.toLowerCase())
  );
  const canCreate =
    typed.length > 0 &&
    !projectTags.some((tag) => tag.toLowerCase() === typed.toLowerCase());

  const toggle = (tag: string) => {
    onTagsChange(
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const create = () => {
    if (!canCreate) {
      return;
    }
    onTagsChange([...tags, typed]);
    setQuery("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className="group/tag relative inline-flex">
          <TagChip tag={tag} className="pr-5" />
          <button
            type="button"
            onClick={() => toggle(tag)}
            aria-label={`Remove label ${tag}`}
            className={cn(
              "absolute top-1/2 right-1 flex size-3.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full opacity-60 outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
              tagColor(tag)
            )}
          >
            <XIcon className="size-2.5" />
          </button>
        </span>
      ))}

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-neutral-500"
            />
          }
        >
          <TagIcon className="size-3.5" />
          {tags.length === 0 ? "Labels" : null}
          <PlusIcon className="size-3" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (canCreate) {
                  create();
                } else if (matching.length === 1) {
                  toggle(matching[0]);
                  setQuery("");
                }
              }
            }}
            placeholder="Search or create a label…"
            aria-label="Search or create a label"
            className="mb-1 h-8 w-full rounded-md bg-neutral-100 px-2.5 text-sm outline-none placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ul className="flex max-h-56 flex-col overflow-y-auto" role="list">
            {matching.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => toggle(tag)}
                    aria-pressed={selected}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100"
                  >
                    <TagChip tag={tag} />
                    {selected ? (
                      <CheckIcon className="ml-auto size-4 text-neutral-500" />
                    ) : null}
                  </button>
                </li>
              );
            })}
            {canCreate ? (
              <li>
                <button
                  type="button"
                  onClick={create}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100"
                >
                  <PlusIcon className="size-4 text-neutral-500" />
                  Create <TagChip tag={typed} />
                </button>
              </li>
            ) : null}
            {matching.length === 0 && !canCreate ? (
              <li className="px-2 py-1.5 text-sm text-neutral-500">
                {projectTags.length === 0
                  ? "Type a name to create the first label."
                  : "No labels match."}
              </li>
            ) : null}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
