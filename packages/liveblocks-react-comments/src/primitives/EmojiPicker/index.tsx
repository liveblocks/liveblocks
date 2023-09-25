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

import {
  cancelIdleCallback,
  requestIdleCallback,
} from "../../utils/request-idle-callback";
import { useTransition } from "../../utils/use-transition";
import { Emoji as AccessibleEmoji } from "../internal/Emoji";
import { EmojiPickerContext, useEmojiPicker } from "./contexts";
import type {
  EmojiData,
  EmojiPickerContentComponents,
  EmojiPickerContentEmojiRowContext,
  EmojiPickerContentProps,
  EmojiPickerData,
  EmojiPickerRootProps,
  EmojiPickerSearchProps,
} from "./types";
import { filterEmojis, generateEmojiPickerData, getEmojiData } from "./utils";

const DEFAULT_COLUMNS = 10;
const DEFAULT_LOCALE = "en";

const EMOJIPICKER_ROOT_NAME = "EmojiPickerRoot";
const EMOJIPICKER_CONTENT_NAME = "EmojiPickerContent";
const EMOJIPICKER_SEARCH_NAME = "EmojiPickerSearch";

function EmojiPickerRoot({
  columns = DEFAULT_COLUMNS,
  locale = DEFAULT_LOCALE,
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

  const initializeEmojiData = useCallback(
    async (locale: string) => {
      try {
        emojiData.current = await getEmojiData(locale);
        updateEmojis();
      } catch (error) {
        setError(error as Error);
      }
    },
    [updateEmojis]
  );

  useEffect(() => {
    const idleCallbackId = requestIdleCallback(() => {
      initializeEmojiData(locale);
    });

    return () => {
      cancelIdleCallback(idleCallbackId);
    };
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

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

const defaultContentComponents: EmojiPickerContentComponents = {
  CategoryHeader: ({ category, ...props }) => <div {...props}>{category}</div>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EmojiRow: ({ children, context, ...props }) => (
    <div {...props}>{children}</div>
  ),
  Emoji: ({ emoji, ...props }) => (
    <button {...props}>
      <AccessibleEmoji emoji={emoji} />
    </button>
  ),
  Loading: (props) => <div {...props} />,
  Empty: (props) => <div {...props} />,
};

const placeholderRowContext: EmojiPickerContentEmojiRowContext = {
  rowIndex: -1,
  categoryRowIndex: -1,
  categoryRowsCount: 0,
};

const EmojiPickerContent = forwardRef<HTMLDivElement, EmojiPickerContentProps>(
  ({ components, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const { data, error, isLoading, columns, onEmojiSelect } = useEmojiPicker();
    const { Loading, Empty, CategoryHeader, EmojiRow, Emoji } = useMemo(
      () => ({ ...defaultContentComponents, ...components }),
      [components]
    );
    const placeholderColumns = useMemo(
      () => Array<string>(columns).fill("🌫️"),
      [columns]
    );

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
          <EmojiRow context={placeholderRowContext}>
            {placeholderColumns.map((placeholder, index) => (
              <Emoji emoji={placeholder} key={index} />
            ))}
          </EmojiRow>
        </div>
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div>Error</div>
        ) : data.count === 0 ? (
          <Empty />
        ) : (
          <GroupedVirtuoso
            groupCounts={data.categoriesRowCounts}
            groupContent={(index) => {
              return <CategoryHeader category={data.categories[index].name} />;
            }}
            itemContent={(index, groupIndex) => {
              return (
                <EmojiRow
                  context={{
                    rowIndex: index,
                    categoryRowIndex:
                      data.categoriesRowIndices[groupIndex].indexOf(index),
                    categoryRowsCount: data.categoriesRowCounts[groupIndex],
                  }}
                >
                  {data.rows[index].emojis.map((emoji) => (
                    <Emoji
                      key={emoji.emoji}
                      onClick={() => onEmojiSelect?.(emoji.emoji)}
                      emoji={emoji.emoji}
                    />
                  ))}
                </EmojiRow>
              );
            }}
          />
        )}
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  EmojiPickerRoot.displayName = EMOJIPICKER_ROOT_NAME;
  EmojiPickerContent.displayName = EMOJIPICKER_CONTENT_NAME;
  EmojiPickerSearch.displayName = EMOJIPICKER_SEARCH_NAME;
}

// NOTE: Every export from this file will be available publicly as EmojiPicker.*
export {
  EmojiPickerContent as Content,
  EmojiPickerRoot as Root,
  EmojiPickerSearch as Search,
};
