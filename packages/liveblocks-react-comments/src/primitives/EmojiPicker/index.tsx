"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ChangeEvent } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GroupedVirtuoso } from "react-virtuoso";

import { useTransition } from "../../utils/use-transition";
import { Emoji } from "../internal/Emoji";
import { EmojiPickerContext, useEmojiPicker } from "./contexts";
import type {
  EmojiData,
  EmojiPickerContentProps,
  EmojiPickerData,
  EmojiPickerRootProps,
  EmojiPickerSearchProps,
} from "./types";
import { filterEmojis, generateEmojiPickerData, getEmojiData } from "./utils";

const DEFAULT_COLUMNS = 10;

const EMOJIPICKER_ROOT_NAME = "EmojiPickerRoot";
const EMOJIPICKER_LIST_NAME = "EmojiPickerList";
const EMOJIPICKER_SEARCH_NAME = "EmojiPickerSearch";

function EmojiPickerRoot({
  columns = DEFAULT_COLUMNS,
  onEmojiSelect,
  children,
}: EmojiPickerRootProps) {
  const emojiData = useRef<EmojiData>();
  const search = useRef("");
  const [, startEmojisTransition] = useTransition();
  const [data, setData] = useState<EmojiPickerData>();
  const [error, setError] = useState<Error>();

  const updateEmojis = useCallback(() => {
    if (!emojiData.current) {
      return;
    }

    startEmojisTransition(() => {
      setData(() => {
        if (!emojiData.current) {
          return;
        }

        const filteredEmojis = filterEmojis(
          emojiData.current.emojis,
          search.current
        );

        return generateEmojiPickerData(
          filteredEmojis,
          emojiData.current.categories,
          columns
        );
      });
    });
  }, [columns]);

  const initializeEmojiData = useCallback(async () => {
    try {
      emojiData.current = await getEmojiData();
      updateEmojis();
    } catch (error) {
      setError(error as Error);
    }
  }, [updateEmojis]);

  useEffect(() => {
    // TODO: Handle deduplication (subscribe if another initializeData is already running), etc.
    initializeEmojiData();
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
          data,
          error,
          isLoading: !data && !error,
          columns,
          onSearch: handleSearch,
          onEmojiSelect,
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
const EmojiPickerContent = forwardRef<HTMLDivElement, EmojiPickerContentProps>(
  ({ asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const { data, error, isLoading, columns, onEmojiSelect } = useEmojiPicker();
    const columnsPlaceholders = useMemo(
      () => Array<string>(columns).fill("🌫️"),
      [columns]
    );

    // TODO: Handle loading
    if (isLoading) {
      return null;
    }

    // TODO: Handle errors
    if (error) {
      return null;
    }

    // // TODO: Handle empty
    // if (data.count === 0) {
    //   return null;
    // }

    return (
      <Component {...props} ref={forwardedRef}>
        {/* Virtualized rows are absolutely positioned so they won't make
            the container automatically pick up their width. To achieve
            an automatic width, we add a relative (but hidden) full row. */}
        <div
          style={{
            visibility: "hidden",
            height: 0,
          }}
        >
          {columnsPlaceholders.map((placeholder, index) => (
            <button key={index}>
              <Emoji emoji={placeholder} />
            </button>
          ))}
        </div>
        <GroupedVirtuoso
          // components={{
          //   EmptyPlaceholder: () => <div>Empty</div>,
          // }}
          groupCounts={data.categoriesRowCounts}
          groupContent={(index) => {
            return (
              <div
                style={{
                  backgroundColor: "white",
                  paddingTop: "1rem",
                  borderBottom: "1px solid #ccc",
                }}
              >
                {data.categories[index].name}
              </div>
            );
          }}
          itemContent={(index) => {
            return (
              <div style={{ paddingRight: 8, paddingLeft: 8 }}>
                {data.rows[index].emojis.map((emoji) => (
                  <button
                    key={emoji.hexcode}
                    onClick={() => onEmojiSelect?.(emoji.emoji)}
                  >
                    <Emoji emoji={emoji.emoji} />
                  </button>
                ))}
              </div>
            );
          }}
        />
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  EmojiPickerRoot.displayName = EMOJIPICKER_ROOT_NAME;
  EmojiPickerContent.displayName = EMOJIPICKER_LIST_NAME;
  EmojiPickerSearch.displayName = EMOJIPICKER_SEARCH_NAME;
}

// NOTE: Every export from this file will be available publicly as EmojiPicker.*
export {
  EmojiPickerContent as List,
  EmojiPickerRoot as Root,
  EmojiPickerSearch as Search,
};
