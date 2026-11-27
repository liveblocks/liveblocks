"use client";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteTrigger,
} from "@ui-sdk/react/autocomplete";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { INPUT_CLASS } from "./input";
import { POPUP_CLASS, POPUP_ITEM_CLASS } from "./menu";

type SuggestInputProps = {
  label: string;
  value: string;
  // Suggested values. Anything else can still be typed.
  options: readonly string[];
  onCommit: (value: string) => void;
  placeholder?: string;
};

/**
 * A text field with suggestions, on ui-sdk's Autocomplete. The arrow always
 * lists every suggestion, whatever the field holds. Typing narrows the list
 * down, and when nothing matches what's typed the whole list stays up rather
 * than leaving it empty.
 *
 * Like the other fields, it commits when you're done (Enter, picking a
 * suggestion, or leaving the field) rather than on every keystroke, so a
 * rename is a single change, and a single undo step.
 */
export function SuggestInput({
  label,
  value,
  options,
  onCommit,
  placeholder,
}: SuggestInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // The text being typed, until it's committed.
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Whether the list follows what's typed. Off when opened from the arrow.
  const [narrowed, setNarrowed] = useState(false);

  const needle = (draft ?? "").trim().toLowerCase();
  const matches =
    narrowed && needle
      ? options.filter((option) => option.toLowerCase().includes(needle))
      : [];
  const shown = matches.length > 0 ? matches : options;

  const commit = (next: string) => {
    setDraft(null);
    if (next !== value) {
      onCommit(next);
    }
  };

  return (
    <Autocomplete
      value={draft ?? value}
      onValueChange={(next, details) => {
        if (details.reason === "item-press") {
          commit(next);
        } else {
          setDraft(next);
          setNarrowed(true);
        }
      }}
      open={open}
      onOpenChange={(next, details) => {
        if (next && details.reason === "trigger-press") {
          setNarrowed(false);
        }
        setOpen(next);
      }}
      // Enter leaves the field, which commits what was typed.
      onSubmit={() => inputRef.current?.blur()}
      // The list is narrowed down above, so that it's never left empty.
      filter={false}
    >
      <div className="relative flex min-w-0">
        <AutocompleteInput
          ref={inputRef}
          aria-label={label}
          placeholder={placeholder}
          className={cn(INPUT_CLASS, "pr-7")}
          onBlur={() => commit(draft === null ? value : draft.trim())}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraft(null);
            }
          }}
        />
        <AutocompleteTrigger
          aria-label={`Show ${label.toLowerCase()} suggestions`}
          className="absolute inset-y-0 right-0 flex w-7 items-center justify-center rounded-r-md text-ink-faint transition-colors outline-none hover:text-ink"
        >
          <ChevronDownIcon className="size-3.5" />
        </AutocompleteTrigger>
      </div>
      <AutocompleteContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className={cn(
          POPUP_CLASS,
          "max-h-[min(15rem,var(--available-height))] w-(--anchor-width) overflow-y-auto"
        )}
      >
        <AutocompleteList>
          {shown.map((option) => (
            <AutocompleteItem
              key={option}
              value={option}
              className={cn(POPUP_ITEM_CLASS, "pr-1.5 pl-2")}
            >
              <span className="min-w-0 flex-1 truncate">{option}</span>
              {option === value ? <CheckIcon /> : null}
            </AutocompleteItem>
          ))}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}
