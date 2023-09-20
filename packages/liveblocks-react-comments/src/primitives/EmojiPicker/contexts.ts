import type { Resolve } from "@liveblocks/core";
import { nn } from "@liveblocks/core";
import { createContext, useContext } from "react";

import type { EmojiPickerRow } from "./types";

type EmojiPickerContextData =
  | {
      rows?: never;
      error?: never;
      isLoading: true;
    }
  | {
      rows: EmojiPickerRow[];
      error?: never;
      isLoading: false;
    }
  | {
      rows?: never;
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
