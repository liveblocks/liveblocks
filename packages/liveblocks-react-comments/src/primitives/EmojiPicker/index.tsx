"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ChangeEvent, SyntheticEvent } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ListProps as VirtuosoListProps } from "react-virtuoso";
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
  EmojiPickerContentEmojiRowAttributes,
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
  EmojiRow: ({ children, attributes, ...props }) => (
    <div {...props}>{children}</div>
  ),
  Emoji: ({ emoji, ...props }) => (
    <button {...props}>
      <AccessibleEmoji emoji={emoji} />
    </button>
  ),
  Loading: (props) => <div {...props} />,
  Empty: (props) => <div {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Error: ({ error, ...props }) => <div {...props} />,
};

const placeholderRowAttributes: EmojiPickerContentEmojiRowAttributes = {
  rowIndex: -1,
  categoryRowIndex: -1,
  categoryRowsCount: 0,
};

const EmojiPickerContent = forwardRef<HTMLDivElement, EmojiPickerContentProps>(
  ({ components, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const { data, error, isLoading, columns, onEmojiSelect } = useEmojiPicker();
    const { Loading, Empty, Error, CategoryHeader, EmojiRow, Emoji } = useMemo(
      () => ({ ...defaultContentComponents, ...components }),
      [components]
    );
    const List = useMemo(
      () =>
        forwardRef<HTMLDivElement, VirtuosoListProps>(
          ({ children, ...props }, forwardedRef) => {
            return (
              <div
                role="grid"
                aria-colcount={columns}
                {...props}
                ref={forwardedRef}
              >
                {children}
              </div>
            );
          }
        ),
      [columns]
    );
    const placeholderColumns = useMemo(
      () => Array<string>(columns).fill("🌫️"),
      [columns]
    );

    const preventDefault = useCallback((event: SyntheticEvent) => {
      event.preventDefault();
    }, []);

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
          <EmojiRow attributes={placeholderRowAttributes}>
            {placeholderColumns.map((placeholder, index) => (
              <Emoji emoji={placeholder} key={index} />
            ))}
          </EmojiRow>
        </div>
        {isLoading ? (
          <Loading />
        ) : error ? (
          <Error error={error} />
        ) : data.count === 0 ? (
          <Empty />
        ) : (
          <GroupedVirtuoso
            components={{
              List,
            }}
            groupCounts={data.categoriesRowCounts}
            groupContent={(groupIndex) => {
              return <CategoryHeader category={data.categories[groupIndex]} />;
            }}
            itemContent={(rowIndex, groupIndex) => {
              const categoryRowIndex =
                data.categoriesRowIndices[groupIndex].indexOf(rowIndex);
              const categoryRowsCount = data.categoriesRowCounts[groupIndex];

              return (
                <EmojiRow
                  attributes={{
                    rowIndex,
                    categoryRowIndex,
                    categoryRowsCount,
                  }}
                >
                  {data.rows[rowIndex].emojis.map((emoji, columnIndex) => (
                    <Emoji
                      key={emoji.emoji}
                      role="gridcell"
                      aria-colindex={columnIndex}
                      onMouseDown={preventDefault}
                      onClick={(event) => {
                        onEmojiSelect?.(emoji.emoji);
                        event.stopPropagation();
                      }}
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
