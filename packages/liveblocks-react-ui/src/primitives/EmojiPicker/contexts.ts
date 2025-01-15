import type { Relax, Resolve } from "@liveblocks/core";
import { nn } from "@liveblocks/core";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { createContext, useContext } from "react";

import type {
  EmojiPickerData,
  EmojiPickerInteraction,
  EmojiPickerSelectionDirection,
} from "./types";

type EmojiPickerContextData = Relax<
  | { isLoading: true }
  | {
      data: EmojiPickerData;
      isLoading: false;
    }
  | {
      error: Error;
      isLoading: false;
    }
>;

export type EmojiPickerContext = Resolve<
  EmojiPickerContextData & {
    columns: number;
    onSearch: (search: string) => void;
    selectCurrentEmoji: () => void;
    onEmojiSelect?: (emoji: string) => void;
    selectedColumnIndex: number;
    selectedRowIndex: number;
    moveSelection: (
      direction: EmojiPickerSelectionDirection,
      event: KeyboardEvent<HTMLInputElement>
    ) => void;
    setPointerSelection: (columnIndex: number, rowIndex: number) => void;
    interaction: EmojiPickerInteraction;
    setInteraction: Dispatch<SetStateAction<EmojiPickerInteraction>>;
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
