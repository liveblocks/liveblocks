"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import { useOthers } from "@liveblocks/react/suspense";
import clsx from "clsx";

export type MentionItem = {
  id: string;
  label: string;
  avatar: string;
};

export type MentionSuggestionsRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

type MentionSuggestionsProps = SuggestionProps<MentionItem, MentionItem>;

export const MentionSuggestions = forwardRef<
  MentionSuggestionsRef,
  MentionSuggestionsProps
>(function MentionSuggestions(props, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = props.items;
  const others = useOthers();
  const onlineIds = useMemo(
    () => new Set(others.map((other) => other.id)),
    [others]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((index) =>
          items.length === 0 ? 0 : (index + items.length - 1) % items.length
        );
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((index) =>
          items.length === 0 ? 0 : (index + 1) % items.length
        );
        return true;
      }

      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          props.command(item);
        }
        return true;
      }

      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-64 rounded-lg border border-border bg-background p-3 text-xs text-muted shadow-lg">
        No matches
      </div>
    );
  }

  return (
    <div className="max-h-64 w-72 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg">
      {items.map((item, index) => {
        const isOnline = onlineIds.has(item.id);

        return (
          <button
            key={item.id}
            type="button"
            className={clsx(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px]",
              index === selectedIndex
                ? "bg-panel-active"
                : "hover:bg-panel-hover"
            )}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              props.command(item);
            }}
          >
            <img
              src={item.avatar}
              alt=""
              className="size-5 rounded bg-panel object-cover"
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              {item.label}
            </span>

            {isOnline ? (
              <>
                <span
                  className="size-2 shrink-0 rounded-full bg-success"
                  aria-label="Online"
                />{" "}
                <span className="text-[11px] text-subtle">Online</span>
              </>
            ) : (
              <>
                <span
                  className="size-2 shrink-0 rounded-full border-[1.5px] border-subtle"
                  aria-label="Offline"
                />{" "}
                <span className="text-[11px] text-subtle">Offline</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
});
