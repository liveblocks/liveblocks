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
  tags?: string[];
};

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

export type EmojiPickerRow = {
  emojis: Emoji[];
};

export type EmojiPickerData = {
  count: number;
  rows: EmojiPickerRow[];
  categories: EmojiCategory[];
  categoriesRowCounts: number[];
  categoriesRowIndices: number[][];
};

export interface EmojiPickerContentCategoryHeaderProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * The category's name.
   */
  category: string;
}

export type EmojiPickerContentEmojiRowContext = {
  /**
   * TODO: JSDoc
   */
  rowIndex: number;

  /**
   * TODO: JSDoc
   */
  categoryRowIndex: number;

  /**
   * TODO: JSDoc
   */
  categoryRowsCount: number;
};

export interface EmojiPickerContentEmojiRowProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * TODO: JSDoc
   */
  context: EmojiPickerContentEmojiRowContext;
}

export interface EmojiPickerContentEmojiProps
  extends ComponentPropsWithoutRef<"button"> {
  /**
   * TODO: JSDoc
   */
  emoji: string;
}

export interface EmojiPickerRootProps extends PropsWithChildren {
  /**
   * TODO: JSDoc
   */
  columns?: number;

  /**
   * TODO: JSDoc
   */
  onEmojiSelect?: (emoji: string) => void;

  /**
   * JSDoc
   */
  locale?: string;
}

export interface EmojiPickerContentComponents {
  /**
   * The component used to display category headers.
   */
  CategoryHeader: ComponentType<EmojiPickerContentCategoryHeaderProps>;

  /**
   * The component used to display emoji rows.
   */
  EmojiRow: ComponentType<EmojiPickerContentEmojiRowProps>;

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
