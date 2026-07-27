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
import { AI_USER_ID } from "@/app/database";

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
      <div className="w-64 rounded border border-neutral-200 bg-white p-3 text-sm text-neutral-500 shadow-lg">
        No matches
      </div>
    );
  }

  return (
    <div className="max-h-64 w-72 overflow-y-auto rounded border border-neutral-200 bg-white py-1 shadow-lg">
      {items.map((item, index) => {
        const isAgent = item.id === AI_USER_ID;
        const isOnline = isAgent || onlineIds.has(item.id);

        return (
          <button
            key={item.id}
            type="button"
            className={clsx(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
              index === selectedIndex
                ? "bg-indigo-500 text-white"
                : "text-neutral-800 hover:bg-neutral-50"
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
              className="size-5 rounded bg-neutral-200 object-cover"
            />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {item.label}
            </span>
            {isAgent ? (
              <span
                className={clsx(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  index === selectedIndex
                    ? "bg-white/20 text-white"
                    : "bg-indigo-100 text-indigo-600"
                )}
              >
                Agent
              </span>
            ) : null}
            {isOnline ? (
              <>
                <span
                  className="size-2 shrink-0 rounded-full bg-green-500"
                  aria-label="Online"
                />{" "}
                <span className="text-neutral-400">Online</span>
              </>
            ) : (
              <>
                <span
                  className={clsx(
                    "size-2 shrink-0 rounded-full border border-[1.5px]",
                    index === selectedIndex
                      ? "border-white/60"
                      : "border-neutral-400"
                  )}
                  aria-label="Offline"
                />{" "}
                <span className="text-neutral-400">Offline</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
});
