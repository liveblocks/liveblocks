"use client";

import { useLayoutEffect } from "@liveblocks/react/_private";
import { Slot } from "@radix-ui/react-slot";
import type { ChangeEvent, KeyboardEvent, SyntheticEvent } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  CalculateViewLocationParams,
  GroupedVirtuosoHandle,
  ListProps as VirtuosoListProps,
  ScrollerProps,
  TopItemListProps,
} from "react-virtuoso";
import { GroupedVirtuoso } from "react-virtuoso";

import { isKey } from "../../utils/is-key";
import {
  cancelIdleCallback,
  requestIdleCallback,
} from "../../utils/request-idle-callback";
import { visuallyHidden } from "../../utils/visually-hidden";
import { Emoji as EmojiPrimitive } from "../internal/Emoji";
import { EmojiPickerContext, useEmojiPicker } from "./contexts";
import type {
  EmojiData,
  EmojiPickerContentComponents,
  EmojiPickerContentEmojiRowAttributes,
  EmojiPickerContentProps,
  EmojiPickerData,
  EmojiPickerRootProps,
  EmojiPickerSearchProps,
  EmojiPickerSelectionDirection,
} from "./types";
import { filterEmojis, generateEmojiPickerData, getEmojiData } from "./utils";

const DEFAULT_COLUMNS = 10;
const DEFAULT_LOCALE = "en";
const LOADING_MINIMUM_TIMEOUT = 100;

const EMOJIPICKER_ROOT_NAME = "EmojiPickerRoot";
const EMOJIPICKER_CONTENT_NAME = "EmojiPickerContent";
const EMOJIPICKER_SEARCH_NAME = "EmojiPickerSearch";

/**
 * @private
 * The EmojiPicker primitive is undocumented for now and subject to change,
 * use at your own risk. If you have any feedback on it, please let us know!
 * See how we use it in the default components to learn how to use it:
 * https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-react-ui/src/components/internal/EmojiPicker.tsx.
 *
 * Surrounds the emoji picker, it handles emoji data and coordinates
 * `EmojiPicker.Search` and `EmojiPicker.Content`.
 *
 * @example
 * <EmojiPicker.Root>
 *   <EmojiPicker.Search />
 *   <EmojiPicker.Content />
 * </EmojiPicker.Root>
 */
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
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [interaction, setInteraction] = useState<
    "keyboard" | "pointer" | "none"
  >("none");

  const selectCurrentEmoji = useCallback(() => {
    if (onEmojiSelect) {
      const emoji = data?.rows[selectedRowIndex]?.[selectedColumnIndex];

      if (emoji) {
        onEmojiSelect(emoji.emoji);
      }
    }
  }, [data?.rows, onEmojiSelect, selectedColumnIndex, selectedRowIndex]);

  const resetSelection = useCallback(() => {
    setSelectedColumnIndex(0);
    setSelectedRowIndex(0);
  }, []);

  const setPointerSelection = useCallback(
    (columnIndex: number, rowIndex: number) => {
      setInteraction("pointer");
      setSelectedColumnIndex(columnIndex);
      setSelectedRowIndex(rowIndex);
    },
    []
  );

  const moveSelection = useCallback(
    (
      direction: EmojiPickerSelectionDirection,
      event: KeyboardEvent<HTMLInputElement>
    ) => {
      if (!data) {
        return;
      }

      event.preventDefault();

      if (interaction === "none") {
        setInteraction("keyboard");
        return;
      }

      setInteraction("keyboard");

      switch (direction) {
        // If first column, move to last column of previous row (if available)
        // Otherwise, move to previous column
        case "left": {
          if (selectedColumnIndex === 0) {
            const previousRowIndex = selectedRowIndex - 1;
            const previousRow = data.rows[previousRowIndex];

            if (previousRow) {
              setSelectedRowIndex(previousRowIndex);
              setSelectedColumnIndex(previousRow.length - 1);
            }
          } else {
            setSelectedColumnIndex(selectedColumnIndex - 1);
          }

          break;
        }

        // If last column, move to first column of next row (if available)
        // Otherwise, move to next column
        case "right": {
          const currentRow = data.rows[selectedRowIndex];

          if (!currentRow) {
            return;
          }

          if (selectedColumnIndex === currentRow.length - 1) {
            const nextRowIndex = selectedRowIndex + 1;
            const nextRow = data.rows[nextRowIndex];

            if (nextRow) {
              setSelectedRowIndex(nextRowIndex);
              setSelectedColumnIndex(0);
            }
          } else {
            setSelectedColumnIndex(selectedColumnIndex + 1);
          }

          break;
        }

        // Move to same column of previous row
        // If same column is not available, move to last column of previous row
        case "up": {
          const previousRow = data.rows[selectedRowIndex - 1];

          if (previousRow) {
            setSelectedRowIndex(selectedRowIndex - 1);

            if (!previousRow[selectedColumnIndex]) {
              setSelectedColumnIndex(previousRow.length - 1);
            }
          }

          break;
        }

        // Move to same column of next row
        // If same column is not available, move to last column of next row
        case "down": {
          const nextRow = data.rows[selectedRowIndex + 1];

          if (nextRow) {
            setSelectedRowIndex(selectedRowIndex + 1);

            if (!nextRow[selectedColumnIndex]) {
              setSelectedColumnIndex(nextRow.length - 1);
            }
          }

          break;
        }
      }
    },
    [data, interaction, selectedColumnIndex, selectedRowIndex]
  );

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
      resetSelection();
    });
  }, [columns, resetSelection]);

  const handleSearch = useCallback(
    (value: string) => {
      search.current = value;
      updateEmojis();
    },
    [updateEmojis]
  );

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
    let idleCallbackId: number;
    const timeoutId = setTimeout(() => {
      idleCallbackId = requestIdleCallback(() => {
        initializeEmojiData(locale);
      });
    }, LOADING_MINIMUM_TIMEOUT);

    return () => {
      clearTimeout(timeoutId);
      cancelIdleCallback(idleCallbackId);
    };
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (interaction === "none") {
      resetSelection();
    }
  }, [interaction]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EmojiPickerContext.Provider
      value={{
        data: data as EmojiPickerData,
        error: error as undefined,
        isLoading: (!data && !error) as false,
        columns,
        onSearch: handleSearch,
        onEmojiSelect,
        selectCurrentEmoji,
        selectedRowIndex,
        selectedColumnIndex,
        moveSelection,
        setPointerSelection,
        interaction,
        setInteraction,
      }}
    >
      {children}
    </EmojiPickerContext.Provider>
  );
}

/**
 * @private
 * The EmojiPicker primitive is undocumented for now and subject to change,
 * use at your own risk. If you have any feedback on it, please let us know!
 * See how we use it in the default components to learn how to use it:
 * https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-react-ui/src/components/internal/EmojiPicker.tsx.
 *
 * The search input of the emoji picker. It also affects the focus and selection
 * within `EmojiPicker.Content`.
 *
 * @example
 * <EmojiPicker.Search />
 */
const EmojiPickerSearch = forwardRef<HTMLInputElement, EmojiPickerSearchProps>(
  ({ asChild, value, defaultValue, onChange, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "input";
    const {
      onSearch,
      selectCurrentEmoji,
      moveSelection,
      interaction,
      setInteraction,
    } = useEmojiPicker();

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        const value = event.target.value;
        setInteraction(value ? "keyboard" : "none");
        onSearch(value);
      },
      [onChange, onSearch, setInteraction]
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.isDefaultPrevented()) {
          return;
        }

        if (isKey(event, "ArrowLeft")) {
          moveSelection("left", event);
        } else if (isKey(event, "ArrowRight")) {
          moveSelection("right", event);
        } else if (isKey(event, "ArrowUp")) {
          moveSelection("up", event);
        } else if (isKey(event, "ArrowDown")) {
          moveSelection("down", event);
        } else if (isKey(event, "Enter")) {
          if (interaction !== "none") {
            event.preventDefault();
            selectCurrentEmoji();
          }
        }
      },
      [interaction, moveSelection, selectCurrentEmoji]
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
        onKeyDown={handleKeyDown}
        {...props}
        ref={forwardedRef}
      />
    );
  }
);

const defaultContentComponents: EmojiPickerContentComponents = {
  CategoryHeader: ({ category, ...props }) => <div {...props}>{category}</div>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Row: ({ children, attributes, ...props }) => <div {...props}>{children}</div>,
  Emoji: ({ emoji, ...props }) => (
    <button {...props}>
      <EmojiPrimitive emoji={emoji} />
    </button>
  ),
  Loading: (props) => <div {...props} />,
  Empty: (props) => <div {...props} />,
  Grid: (props) => <div {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Error: ({ error, ...props }) => <div {...props} />,
};

const placeholderRowAttributes: EmojiPickerContentEmojiRowAttributes = {
  rowIndex: -1,
  categoryRowIndex: -1,
  categoryRowsCount: 0,
};

// About `data-testid={undefined}`: Virtuoso bakes test IDs into the components we pass
// to it, so we manually remove them.

const VirtuosoScroller = forwardRef<HTMLDivElement, ScrollerProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <div {...props} tabIndex={-1} data-testid={undefined} ref={forwardedRef}>
        {children}
      </div>
    );
  }
);

const VirtuosoTopList = forwardRef<HTMLDivElement, TopItemListProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <div {...props} data-testid={undefined} ref={forwardedRef}>
        {children}
      </div>
    );
  }
);

/**
 * @private
 * The EmojiPicker primitive is undocumented for now and subject to change,
 * use at your own risk. If you have any feedback on it, please let us know!
 * See how we use it in the default components to learn how to use it:
 * https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-react-ui/src/components/internal/EmojiPicker.tsx.
 *
 * The main content of the emoji picker, either displaying the emoji grid or various
 * alternative states (loading, empty, and error).
 *
 * @example
 * <EmojiPicker.Content
 *  components={{
 *    Loading: EmojiPickerLoading,
 *    Empty: EmojiPickerEmpty,
 *    Error: EmojiPickerError,
 *    CategoryHeader: EmojiPickerCategoryHeader,
 *    Grid: EmojiPickerGrid,
 *    Row: EmojiPickerRow,
 *    Emoji: EmojiPickerEmoji,
 *  }}
 * />
 */
const EmojiPickerContent = forwardRef<HTMLDivElement, EmojiPickerContentProps>(
  ({ components, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
    const placeholderContainerRef = useRef<HTMLDivElement>(null);
    const rowScrollMarginTopRef = useRef<number>(0);
    const rowScrollMarginBottomRef = useRef<number>(0);
    const categoryHeaderHeightRef = useRef<number>(0);
    const {
      data,
      error,
      isLoading,
      columns,
      onEmojiSelect,
      selectedColumnIndex,
      selectedRowIndex,
      setPointerSelection,
      interaction,
      setInteraction,
    } = useEmojiPicker();
    const selectedEmoji = useMemo(
      () => data?.rows[selectedRowIndex]?.[selectedColumnIndex],
      [data?.rows, selectedColumnIndex, selectedRowIndex]
    );
    const { Loading, Empty, Error, CategoryHeader, Grid, Row, Emoji } = useMemo(
      () => ({ ...defaultContentComponents, ...components }),
      [components]
    );
    const VirtuosoList = useMemo(
      () =>
        forwardRef<HTMLDivElement, VirtuosoListProps>(
          ({ children, ...props }, forwardedRef) => {
            return (
              <div
                role="grid"
                aria-colcount={columns}
                {...props}
                data-testid={undefined}
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

    const handleEmojiPointerLeave = useCallback(() => {
      if (interaction === "pointer") {
        setInteraction("none");
      }
    }, [interaction, setInteraction]);

    useLayoutEffect(() => {
      if (!placeholderContainerRef.current) {
        return;
      }

      const row = placeholderContainerRef.current.childNodes[0];
      const categoryHeader = placeholderContainerRef.current.childNodes[1];

      if (row instanceof HTMLElement) {
        const style = window.getComputedStyle(row);

        rowScrollMarginTopRef.current = parseFloat(style.scrollMarginTop);
        rowScrollMarginBottomRef.current = parseFloat(style.scrollMarginBottom);
      }

      if (categoryHeader instanceof HTMLElement) {
        categoryHeaderHeightRef.current = categoryHeader.offsetHeight;
      }
    }, []);

    // Customize `scrollIntoView` behavior to take into account category headers and margins
    const calculateViewLocation = useCallback(
      ({
        itemTop,
        itemBottom,
        viewportTop,
        viewportBottom,
        locationParams: { behavior, align, ...params },
      }: CalculateViewLocationParams) => {
        if (
          itemTop -
            (categoryHeaderHeightRef.current + rowScrollMarginTopRef.current) <
          viewportTop
        ) {
          return {
            ...params,
            behavior,
            align: align ?? "start",
          };
        }

        if (itemBottom > viewportBottom) {
          return {
            ...params,
            behavior,
            align: align ?? "end",
            offset: rowScrollMarginBottomRef.current,
          };
        }

        return null;
      },
      []
    );

    useEffect(() => {
      if (interaction === "keyboard") {
        virtuosoRef.current?.scrollIntoView({
          index: selectedRowIndex,
          behavior: "auto",
          calculateViewLocation,
        });
      }
    }, [interaction, selectedRowIndex, calculateViewLocation]);

    return (
      <Component {...props} ref={forwardedRef}>
        <div
          style={{
            visibility: "hidden",
            height: 0,
          }}
          ref={placeholderContainerRef}
        >
          {/* Virtualized rows are absolutely positioned so they won't make
            the container automatically pick up their width. To achieve
            an automatic width, we add a relative (but hidden) full row. */}
          <Row attributes={placeholderRowAttributes}>
            {placeholderColumns.map((placeholder, index) => (
              <Emoji emoji={placeholder} key={index} />
            ))}
          </Row>
          {/* We also add a hidden category header to get its computed height. */}
          <CategoryHeader category="Category" />
        </div>
        {isLoading ? (
          <Loading />
        ) : error ? (
          <Error error={error} />
        ) : data.count === 0 ? (
          <Empty />
        ) : (
          <Grid>
            <GroupedVirtuoso
              ref={virtuosoRef}
              components={{
                Scroller: VirtuosoScroller,
                List: VirtuosoList,
                TopItemList: VirtuosoTopList,
              }}
              groupCounts={data.categoriesRowCounts}
              groupContent={(groupIndex) => {
                const category = data.categories[groupIndex];

                if (!category) {
                  return null;
                }

                return <CategoryHeader category={category} />;
              }}
              itemContent={(rowIndex, groupIndex) => {
                const categoryRow = data.rows[rowIndex];
                const categoryRowIndex =
                  data.categoriesRowIndices[groupIndex]?.indexOf(rowIndex);
                const categoryRowsCount = data.categoriesRowCounts[groupIndex];

                if (
                  categoryRow === undefined ||
                  categoryRowIndex === undefined ||
                  categoryRowsCount === undefined
                ) {
                  return null;
                }

                return (
                  <Row
                    attributes={{
                      rowIndex,
                      categoryRowIndex,
                      categoryRowsCount,
                    }}
                  >
                    {categoryRow.map((emoji, columnIndex) => {
                      const isSelected =
                        interaction !== "none" &&
                        selectedColumnIndex === columnIndex &&
                        selectedRowIndex === rowIndex;

                      return (
                        <Emoji
                          key={emoji.emoji}
                          role="gridcell"
                          aria-colindex={columnIndex}
                          aria-selected={isSelected || undefined}
                          data-selected={isSelected || undefined}
                          onMouseDown={preventDefault}
                          tabIndex={-1}
                          onPointerEnter={() => {
                            setPointerSelection(columnIndex, rowIndex);
                          }}
                          onPointerLeave={handleEmojiPointerLeave}
                          onClick={(event) => {
                            onEmojiSelect?.(emoji.emoji);
                            event.stopPropagation();
                          }}
                          emoji={emoji.emoji}
                        />
                      );
                    })}
                  </Row>
                );
              }}
            />
          </Grid>
        )}
        {selectedEmoji && interaction !== "none" && (
          <div aria-live="polite" style={visuallyHidden}>
            {selectedEmoji.name}
          </div>
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
