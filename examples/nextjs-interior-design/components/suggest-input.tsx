"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type SuggestInputProps = {
  value: string;
  // Suggested values. Anything else can still be typed.
  options: readonly string[];
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * A text field with suggestions. The arrow always lists every suggestion,
 * whatever the field holds. Typing narrows the list down, and when nothing
 * matches what's typed the whole list stays up rather than leaving it empty.
 *
 * Like the other fields, it commits when you're done (Enter, picking a
 * suggestion, or leaving the field) rather than on every keystroke, so a
 * rename is a single change, and a single undo step.
 */
export function SuggestInput({
  value,
  options,
  onCommit,
  placeholder,
  className,
}: SuggestInputProps) {
  const listId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Whether the list follows what's typed. Off when opened from the arrow.
  const [narrowed, setNarrowed] = useState(false);
  const [active, setActive] = useState(-1);

  const needle = (draft ?? "").trim().toLowerCase();
  const matches =
    narrowed && needle
      ? options.filter((option) => option.toLowerCase().includes(needle))
      : [];
  const shown = matches.length > 0 ? matches : options;

  useEffect(() => {
    if (open && active >= 0) {
      listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active]);

  const showAll = () => {
    setNarrowed(false);
    setActive(options.indexOf(value));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const commit = (next: string) => {
    setDraft(null);
    close();
    if (next !== value) {
      onCommit(next);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        showAll();
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) =>
        current < 0
          ? step > 0
            ? 0
            : shown.length - 1
          : (current + step + shown.length) % shown.length
      );
    } else if (event.key === "Enter") {
      const picked = open ? shown[active] : undefined;
      if (picked !== undefined) {
        commit(picked);
      } else {
        event.currentTarget.blur();
      }
    } else if (event.key === "Escape") {
      setDraft(null);
      close();
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
    >
      <Popover.Anchor asChild>
        <div ref={anchorRef} className="relative flex min-w-0">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && active >= 0 ? `${listId}-${active}` : undefined
            }
            autoComplete="off"
            placeholder={placeholder}
            className={cn(className, "pr-7")}
            value={draft ?? value}
            onChange={(event) => {
              setDraft(event.target.value);
              setNarrowed(true);
              setActive(-1);
              setOpen(true);
            }}
            onBlur={() => commit(draft === null ? value : draft.trim())}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Show suggestions"
            // Keep the focus in the field.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (open) {
                close();
              } else {
                inputRef.current?.focus();
                showAll();
              }
            }}
            className="absolute inset-y-0 right-0 flex w-7 items-center justify-center rounded-r-md text-ink-faint transition-colors outline-none hover:text-ink"
          >
            <ChevronDownIcon className="size-3.5" />
          </button>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          ref={listRef}
          id={listId}
          role="listbox"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          // The focus stays in the field the whole time the list is open.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          // The field and its arrow are outside the list, but part of it.
          onInteractOutside={(event) => {
            if (
              event.target instanceof Node &&
              anchorRef.current?.contains(event.target)
            ) {
              event.preventDefault();
            }
          }}
          className="menu-animate z-50 max-h-[min(15rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) overflow-y-auto rounded-lg border border-line bg-popover p-1 text-popover-foreground shadow-sm [--menu-origin:var(--radix-popover-content-transform-origin)]"
        >
          {shown.map((option, index) => (
            <div
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              data-active={index === active ? "" : undefined}
              onPointerMove={() => setActive(index)}
              onClick={() => commit(option)}
              className="flex h-7 cursor-default items-center gap-2 rounded pr-1.5 pl-2 text-[13px] leading-none select-none data-[active]:bg-accent data-[active]:text-accent-foreground"
            >
              <span className="min-w-0 flex-1 truncate">{option}</span>
              {option === value ? (
                <CheckIcon className="size-3.5 shrink-0 text-ink-muted" />
              ) : null}
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
