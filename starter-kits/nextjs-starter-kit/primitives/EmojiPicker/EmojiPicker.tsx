import { EmojiPicker as EmojiPickerPrimitive } from "frimousse";
import styles from "./EmojiPicker.module.css";

export function MyEmojiPicker({
  onEmojiSelect,
}: {
  onEmojiSelect: (emoji: string) => void;
}) {
  return (
    <EmojiPickerPrimitive.Root
      className={styles.root}
      onEmojiSelect={(emojiData) => onEmojiSelect(emojiData.emoji)}
    >
      <EmojiPickerPrimitive.Search />
      <EmojiPickerPrimitive.Viewport>
        <EmojiPickerPrimitive.Loading>Loading…</EmojiPickerPrimitive.Loading>
        <EmojiPickerPrimitive.Empty>No emoji found.</EmojiPickerPrimitive.Empty>
        <EmojiPickerPrimitive.List />
      </EmojiPickerPrimitive.Viewport>
    </EmojiPickerPrimitive.Root>
  );
}
