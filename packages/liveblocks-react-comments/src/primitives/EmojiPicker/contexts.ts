import type { Resolve } from "@liveblocks/core";
import { nn } from "@liveblocks/core";
import { createContext, useContext } from "react";

import type { EmojiPickerData } from "./types";

type EmojiPickerContextData =
  | {
      data?: never;
      error?: never;
      isLoading: true;
    }
  | {
      data: EmojiPickerData;
      error?: never;
      isLoading: false;
    }
  | {
      data?: never;
      error: Error;
      isLoading: false;
    };

export type EmojiPickerContext = Resolve<
  EmojiPickerContextData & {
    columns: number;
    onSearch: (search: string) => void;
    onEmojiSelect?: (emoji: string) => void;
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
