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
        <div className={styles.searchWrapper}>
          <EmojiPickerPrimitive.Search className={styles.search} />
        </div>
        {buttonSlot}
      </div>
      <EmojiPickerPrimitive.Viewport className={styles.viewport}>
        <EmojiPickerPrimitive.Loading className={styles.loading}>
          Loading…
        </EmojiPickerPrimitive.Loading>
        <EmojiPickerPrimitive.Empty className={styles.empty}>
          No emoji found.
        </EmojiPickerPrimitive.Empty>
        <EmojiPickerPrimitive.List
          className={styles.list}
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div className={styles.categoryHeader} {...props}>
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div className={styles.row} {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button className={styles.emoji} {...props}>
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPickerPrimitive.Viewport>
    </EmojiPickerPrimitive.Root>
  );
}
