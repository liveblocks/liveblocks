import type {
  ComponentPropsWithoutRef,
  ComponentType,
  PropsWithChildren,
} from "react";

import type { ComponentPropsWithSlot } from "../../types";

export type Emoji = {
  emoji: string;
  category: number;
  name: string;
  version: number;
  countryFlag?: true;
  tags?: string[];
};

export type IndexedEmoji = Emoji & { index: number };

export type EmojiCategory = {
  key: number;
  name: string;
};

export type EmojiSkinTone = {
  key: string;
  name: string;
};

export type EmojiData = {
  emojis: Emoji[];
  categories: EmojiCategory[];
  skinTones: EmojiSkinTone[];
};

export type EmojiPickerRow = IndexedEmoji[];

export type EmojiPickerData = {
  count: number;
  rows: EmojiPickerRow[];
  categories: string[];
  categoriesRowCounts: number[];
  categoriesRowIndices: number[][];
};

export type EmojiPickerSelectionDirection = "left" | "right" | "up" | "down";

export type EmojiPickerInteraction = "keyboard" | "pointer" | "none";

export type EmojiPickerContentLoadingProps = ComponentPropsWithoutRef<"div">;

export type EmojiPickerContentEmptyProps = ComponentPropsWithoutRef<"div">;

export type EmojiPickerContentGridProps = ComponentPropsWithoutRef<"div">;

export interface EmojiPickerContentErrorProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * The error.
   */
  error: Error;
}

export interface EmojiPickerContentCategoryHeaderProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * The category's name.
   */
  category: string;
}

export type EmojiPickerContentEmojiRowAttributes = {
  /**
   * The current row's index.
   */
  rowIndex: number;

  /**
   * The current row's index within the current category.
   */
  categoryRowIndex: number;

  /**
   * The number of rows within the current category.
   */
  categoryRowsCount: number;
};

export interface EmojiPickerContentRowProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * Attributes related to the current row.
   */
  attributes: EmojiPickerContentEmojiRowAttributes;
}

export interface EmojiPickerContentEmojiProps
  extends ComponentPropsWithoutRef<"button"> {
  /**
   * The emoji to be displayed.
   */
  emoji: string;
}

export interface EmojiPickerRootProps extends PropsWithChildren {
  /**
   * The number of emojis per row.
   */
  columns?: number;

  /**
   * The event handler called when an emoji is selected.
   */
  onEmojiSelect?: (emoji: string) => void;

  /**
   * The locale used when getting emoji data.
   */
  locale?: string;
}

export interface EmojiPickerContentComponents {
  /**
   * The component displayed when the emoji data is loading.
   */
  Loading: ComponentType<EmojiPickerContentLoadingProps>;

  /**
   * The component displayed when there are no results.
   */
  Empty: ComponentType<EmojiPickerContentEmptyProps>;

  /**
   * The component displayed when there was an error while getting the emoji data.
   */
  Error: ComponentType<EmojiPickerContentErrorProps>;

  /**
   * The component used to display category headers.
   */
  CategoryHeader: ComponentType<EmojiPickerContentCategoryHeaderProps>;

  /**
   * The component displayed when there are emojis to display.
   */
  Grid: ComponentType<EmojiPickerContentGridProps>;

  /**
   * The component used to display rows of emojis.
   */
  Row: ComponentType<EmojiPickerContentRowProps>;

  /**
   * The component used to display emojis.
   */
  Emoji: ComponentType<EmojiPickerContentEmojiProps>;
}

export interface EmojiPickerContentProps extends ComponentPropsWithSlot<"div"> {
  /**
   * The components displayed within the content.
   */
  components?: Partial<EmojiPickerContentComponents>;
}

export type EmojiPickerSearchProps = ComponentPropsWithSlot<"input">;
