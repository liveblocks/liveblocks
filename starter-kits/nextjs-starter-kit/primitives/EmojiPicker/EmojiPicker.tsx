import { EmojiPicker as EmojiPickerPrimitive } from "frimousse";
import styles from "./EmojiPicker.module.css";
import { ReactNode } from "react";

export function MyEmojiPicker({
  onEmojiSelect,
  buttonSlot,
}: {
  onEmojiSelect: (emoji: string) => void;
  buttonSlot?: ReactNode;
}) {
  return (
    <EmojiPickerPrimitive.Root
      className={styles.root}
      onEmojiSelect={(emojiData) => onEmojiSelect(emojiData.emoji)}
    >
      <div className={styles.header}>
        <EmojiPickerPrimitive.Search className={styles.search} />
        {buttonSlot}
      </div>
      <EmojiPickerPrimitive.Viewport>
        <EmojiPickerPrimitive.Loading>Loading…</EmojiPickerPrimitive.Loading>
        <EmojiPickerPrimitive.Empty>No emoji found.</EmojiPickerPrimitive.Empty>
        <EmojiPickerPrimitive.List />
      </EmojiPickerPrimitive.Viewport>
    </EmojiPickerPrimitive.Root>
  );
}
