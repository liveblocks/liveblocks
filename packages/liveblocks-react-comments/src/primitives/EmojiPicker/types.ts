import type { PropsWithChildren } from "react";

import type { ComponentPropsWithSlot } from "../../types";

export type Emoji = {
  emoji: string;
  hexcode: string;
  category: number;
  name: string;
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
};

export interface EmojiPickerRootProps extends PropsWithChildren {
  columns?: number;
  onEmojiSelect?: (emoji: string) => void;
}

export type EmojiPickerContentProps = ComponentPropsWithSlot<"div">;

export type EmojiPickerSearchProps = ComponentPropsWithSlot<"input">;
