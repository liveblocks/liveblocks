import type { Resolve } from "@liveblocks/core";
import { nn } from "@liveblocks/core";
import { createContext, useContext } from "react";

import type { EmojiCategoryWithEmojis } from "./types";

type EmojiPickerContextData =
  | {
      emojis?: never;
      error?: never;
      isLoading: true;
    }
  | {
      emojis: EmojiCategoryWithEmojis[];
      error?: never;
      isLoading: false;
    }
  | {
      emojis?: never;
      error: Error;
      isLoading: false;
    };

export type EmojiPickerContext = Resolve<
  EmojiPickerContextData & {
    onSearch: (search: string) => void;
  }
>;

export const EmojiPickerContext = createContext<EmojiPickerContext | null>(
  null
);

export function useEmojiPicker(): EmojiPickerContext {
  const emojiPickerContext = useContext(EmojiPickerContext);

  return nn(
    emojiPickerContext,
    "EmojiPicker.Root is missing from the React tree."
  );
}
