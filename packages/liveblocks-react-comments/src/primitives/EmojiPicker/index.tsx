"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ChangeEvent } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { VList } from "virtua";

import { Emoji } from "../internal/Emoji";
import { EmojiPickerContext, useEmojiPicker } from "./contexts";
import type {
  EmojiData,
  EmojiPickerListProps,
  EmojiPickerRootProps,
  EmojiPickerRow,
  EmojiPickerSearchProps,
} from "./types";
import { filterEmojis, generatePickerRows, getEmojiData } from "./utils";

const DEFAULT_COLUMNS = 10;

const EMOJIPICKER_ROOT_NAME = "EmojiPickerRoot";
const EMOJIPICKER_LIST_NAME = "EmojiPickerList";
const EMOJIPICKER_SEARCH_NAME = "EmojiPickerSearch";

function EmojiPickerRoot({
  columns = DEFAULT_COLUMNS,
  children,
}: EmojiPickerRootProps) {
  // TODO: Ponyfill/polyfill useTransition
  const data = useRef<EmojiData>();
  const search = useRef("");
  const [, startEmojisTransition] = useTransition();
  const [rows, setRows] = useState<EmojiPickerRow[]>([]);
  const [error, setError] = useState<Error>();

  const updateEmojis = useCallback(() => {
    if (!data.current) {
      return;
    }

    startEmojisTransition(() => {
      setRows(() => {
        if (!data.current) {
          return [];
        }

        const filteredEmojis = filterEmojis(
          data.current.emojis,
          search.current
        );

        return generatePickerRows(
          filteredEmojis,
          data.current.categories,
          columns
        );
      });
    });
  }, [columns]);

  const initializeData = useCallback(async () => {
    try {
      data.current = await getEmojiData();
      updateEmojis();
    } catch (error) {
      setError(error as Error);
    }
  }, [updateEmojis]);

  useEffect(() => {
    // TODO: Handle deduplication (subscribe if another initializeData is already running), etc.
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    (value: string) => {
      search.current = value;
      updateEmojis();
    },
    [updateEmojis]
  );

  return (
    <EmojiPickerContext.Provider
      value={
        {
          rows,
          error,
          isLoading: !data && !error,
          onSearch: handleSearch,
        } as EmojiPickerContext
      }
    >
      {children}
    </EmojiPickerContext.Provider>
  );
}

const EmojiPickerSearch = forwardRef<HTMLInputElement, EmojiPickerSearchProps>(
  ({ asChild, value, defaultValue, onChange, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "input";
    const { onSearch } = useEmojiPicker();

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onSearch(event.target.value);
        onChange?.(event);
      },
      [onChange, onSearch]
    );

    useEffect(() => {
      onSearch(
        value ? String(value) : defaultValue ? String(defaultValue) : ""
      );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <Component
        type="search"
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        {...props}
        ref={forwardedRef}
      />
    );
  }
);

// TODO: renderLoading
// TODO: renderError
// TODO: renderEmpty
// TODO: renderRow
// TODO: renderCategoryHeader
// TODO: renderEmoji
const EmojiPickerList = forwardRef<HTMLDivElement, EmojiPickerListProps>(
  ({ asChild, onEmojiSelect, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const { rows, error, isLoading } = useEmojiPicker();

    // TODO: Handle loading
    if (isLoading) {
      return null;
    }

    // TODO: Handle errors
    if (error) {
      return null;
    }

    // TODO: Handle empty
    if (rows.length === 0) {
      return null;
    }

    return (
      <Component {...props} ref={forwardedRef}>
        <VList>
          {rows.map((row, index) => {
            switch (row.type) {
              case "category":
                return <div key={index}>{row.category}</div>;
              case "emojis":
                return (
                  <div key={index}>
                    {row.emojis.map((emoji) => (
                      <button
                        key={emoji.hexcode}
                        onClick={() => onEmojiSelect?.(emoji.emoji)}
                      >
                        <Emoji emoji={emoji.emoji} />
                      </button>
                    ))}
                  </div>
                );
            }
          })}
        </VList>
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  EmojiPickerRoot.displayName = EMOJIPICKER_ROOT_NAME;
  EmojiPickerList.displayName = EMOJIPICKER_LIST_NAME;
  EmojiPickerSearch.displayName = EMOJIPICKER_SEARCH_NAME;
}

// NOTE: Every export from this file will be available publicly as EmojiPicker.*
export {
  EmojiPickerList as List,
  EmojiPickerRoot as Root,
  EmojiPickerSearch as Search,
};
