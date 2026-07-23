"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
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
      <div className="w-64 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-500 shadow-lg">
        No matches
      </div>
    );
  }

  return (
    <div className="max-h-64 w-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={clsx(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
            index === selectedIndex
              ? "bg-indigo-50 text-indigo-900"
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
            className="size-7 rounded-full bg-neutral-200 object-cover"
          />
          <span className="truncate font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
});
