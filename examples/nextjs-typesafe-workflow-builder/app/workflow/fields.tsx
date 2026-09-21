"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";

/**
 * Keeps a local draft while typing and commits on blur / Enter, so every
 * keystroke isn't written to Storage (and other users' cursors don't jump).
 */
function useDraft(value: string, onCommit: (value: string) => void) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = useCallback(() => {
    if (draft !== value) {
      onCommit(draft);
    }
  }, [draft, value, onCommit]);

  return { draft, setDraft, commit };
}

const inputClassName =
  "workflow-field nodrag nopan min-w-0 w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-violet-400 focus:outline-none";

export function TextField({
  value,
  onCommit,
  className,
  fit,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
  /** Size the input to its text so surrounding space stays free for dragging. */
  fit?: boolean;
}) {
  const { draft, setDraft, commit } = useDraft(value, onCommit);

  const input = (
    <input
      {...props}
      size={fit ? 1 : undefined}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      spellCheck={false}
      className={`${inputClassName} ${fit ? "absolute inset-0 h-full !w-full !min-w-0 !px-1 !py-0 font-[inherit] text-[length:inherit] leading-[inherit]" : ""} ${className ?? ""}`}
    />
  );

  if (!fit) {
    return input;
  }

  // Hidden copy sizes the control to the text; the input is taken out of flow
  // so its default 20ch width cannot stretch the header.
  return (
    <span className="relative inline-flex h-5 max-w-full shrink-0 items-center text-xs font-medium leading-5">
      <span aria-hidden className="invisible whitespace-pre pl-1 pr-2.5">
        {draft || " "}
      </span>
      {input}
    </span>
  );
}

export function TextArea({
  value,
  onCommit,
  className,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  const { draft, setDraft, commit } = useDraft(value, onCommit);

  return (
    <textarea
      {...props}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      spellCheck={false}
      className={`${inputClassName} resize-none leading-relaxed ${className ?? ""}`}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`workflow-field nodrag nopan min-h-7 min-w-0 rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-xs text-neutral-900 focus:border-violet-400 focus:outline-none ${className ?? ""}`}
    />
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
      {children}
    </span>
  );
}
