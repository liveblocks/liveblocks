import { EmojiPicker as EmojiPickerPrimitive } from "frimousse";
import { ReactNode } from "react";
import styles from "./EmojiPicker.module.css";

export function EmojiPicker({
  onEmojiSelect,
  buttonSlot,
}: {
  onEmojiSelect: (emoji: string) => void;
  buttonSlot?: ReactNode;
}) {
  return (
    <EmojiPickerPrimitive.Root
      className={styles.root}
      onEmojiSelect={({ emoji }) => onEmojiSelect(emoji)}
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
