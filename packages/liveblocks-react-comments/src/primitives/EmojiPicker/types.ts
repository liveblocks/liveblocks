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

export type EmojiCategoryWithEmojis = EmojiCategory & {
  emojis: Emoji[];
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

export type EmojiPickerRootProps = PropsWithChildren;

export interface EmojiPickerListProps extends ComponentPropsWithSlot<"div"> {
  columns?: number;
}

export type EmojiPickerSearchProps = ComponentPropsWithSlot<"input">;
