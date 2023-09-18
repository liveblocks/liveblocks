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

import { chunk } from "../../utils/chunk";
import { Emoji } from "../internal/Emoji";
import { EmojiPickerContext, useEmojiPicker } from "./contexts";
import type {
  EmojiCategoryWithEmojis,
  EmojiData,
  EmojiPickerListProps,
  EmojiPickerRootProps,
  EmojiPickerSearchProps,
} from "./types";
import { filterEmojis, getEmojiData, groupEmojisByCategory } from "./utils";

const EMOJIPICKER_ROOT_NAME = "EmojiPickerRoot";
const EMOJIPICKER_LIST_NAME = "EmojiPickerList";
const EMOJIPICKER_SEARCH_NAME = "EmojiPickerSearch";

function EmojiPickerRoot({ children }: EmojiPickerRootProps) {
  // TODO: Ponyfill/polyfill useTransition
  const data = useRef<EmojiData>();
  const search = useRef("");
  const [, startEmojisTransition] = useTransition();
  const [emojis, setEmojis] = useState<EmojiCategoryWithEmojis[]>([]);
  const [error, setError] = useState<Error>();

  const updateEmojis = useCallback(() => {
    if (!data.current) {
      return;
    }

    startEmojisTransition(() => {
      setEmojis(() => {
        if (!data.current) {
          return [];
        }

        return groupEmojisByCategory(
          filterEmojis(data.current.emojis, search.current),
          data.current.categories
        );
      });
    });
  }, []);

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
          emojis,
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
// TODO: renderCategoryHeader
// TODO: renderEmoji
const EmojiPickerList = forwardRef<HTMLDivElement, EmojiPickerListProps>(
  ({ columns = 9, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "span";
    const { emojis, error, isLoading } = useEmojiPicker();

    // TODO: Handle loading
    if (isLoading) {
      return null;
    }

    // TODO: Handle errors
    if (error) {
      return null;
    }

    // TODO: Handle empty
    if (emojis.length === 0) {
      return null;
    }

    return (
      <Component {...props} ref={forwardedRef}>
        {emojis.map((category) => {
          const rows = chunk(category.emojis, columns);

          return (
            <div key={category.key}>
              <div>{category.name}</div>
              <div>
                {rows.map((row, index) => (
                  <div key={index}>
                    {row.map((emoji) => (
                      <button key={emoji.hexcode}>
                        <Emoji emoji={emoji.emoji} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
