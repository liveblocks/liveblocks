import { BlockNoteEditor } from "@blocknote/core";
import { useMutation, useStorage } from "@liveblocks/react";
import { Title } from "@/components/NoteEditor/Title";
import styles from "./NoteHeader.module.css";
import { Button } from "@/primitives/Button";
import { useState } from "react";
import { Popover } from "@/primitives/Popover";
import { CrossIcon, ImageIcon } from "@/icons";
import { Icon } from "@liveblocks/react-ui";
import { MyEmojiPicker } from "@/primitives/EmojiPicker";

export function NoteHeader({ editor }: { editor: BlockNoteEditor | null }) {
  return (
    <div className={styles.noteHeader}>
      <Cover />
      <EmojiAndButtons />
      <Title editor={editor} />
    </div>
  );
}

const COLORS = [
  "oklch(0.586 0.253 17.585)",
  "oklch(0.705 0.213 47.604)",
  "oklch(0.795 0.184 86.047)",
  "oklch(0.723 0.219 149.579)",
  "oklch(0.685 0.169 237.323)",
  "oklch(0.606 0.25 292.717)",
  "oklch(0.554 0.046 257.417)",
];

function EmojiAndButtons() {
  const cover = useStorage((root) => root.cover);
  const icon = useStorage((root) => root.icon);

  const [isCoverPopoverOpen, setIsCoverPopoverOpen] = useState(false);
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);
  const isPopoverOpen = isCoverPopoverOpen || isEmojiPopoverOpen;

  const setCover = useMutation(({ storage }, newColor: string | null) => {
    storage.set("cover", newColor);
  }, []);

  const setIcon = useMutation(({ storage }, newIcon: string | null) => {
    storage.set("icon", newIcon);
  }, []);

  return (
    <div
      className={styles.buttonRow}
      data-icon={icon !== null || undefined}
      data-popover-open={isPopoverOpen || undefined}
    >
      <Popover
        open={isEmojiPopoverOpen}
        onOpenChange={setIsEmojiPopoverOpen}
        content={
          <MyEmojiPicker
            onEmojiSelect={(emoji) => {
              setIcon(emoji);
              setIsEmojiPopoverOpen(false);
            }}
          />
        }
      >
        {icon ? (
          <button className={styles.iconButton}>
            <span className={styles.iconButtonIcon}>{icon}</span>{" "}
            <span className="sr-only">Change icon</span>
          </button>
        ) : (
          <Button
            variant="subtle"
            icon={<Icon.Emoji style={{ marginRight: -2 }} />}
            onClick={() => setIsEmojiPopoverOpen(true)}
            className={styles.buttonRowButton}
          >
            Add icon
          </Button>
        )}
      </Popover>
      <Popover
        open={isCoverPopoverOpen}
        onOpenChange={setIsCoverPopoverOpen}
        content={
          <div className={styles.coverPopover}>
            {COLORS.map((color) => (
              <button
                key={color}
                className={styles.coverPopoverItem}
                style={{
                  backgroundColor: color,
                }}
                onClick={() => setCover(color)}
                data-active={cover === color || undefined}
              >
                <span className="sr-only">Change colour to {color}</span>
              </button>
            ))}
            <button
              className={styles.coverPopoverItem}
              onClick={() => setCover(null)}
              data-active={cover === null || undefined}
            >
              <CrossIcon style={{ width: 24, height: 24 }} />
              <span className="sr-only">Remove cover</span>
            </button>
          </div>
        }
      >
        <Button
          variant="subtle"
          onClick={() => setIsCoverPopoverOpen(true)}
          icon={<ImageIcon style={{ width: 18, height: 18 }} />}
          className={styles.buttonRowButton}
        >
          Change cover
        </Button>
      </Popover>
    </div>
  );
}

function Cover() {
  const cover = useStorage((root) => root.cover);

  if (!cover) {
    return <div style={{ height: 80 }} />;
  }

  return <div style={{ backgroundColor: cover, height: 200 }} />;
}
