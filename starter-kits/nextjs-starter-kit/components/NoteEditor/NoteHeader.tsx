import { BlockNoteEditor } from "@blocknote/core";
import { useMutation, useSelf, useStorage } from "@liveblocks/react";
import { Icon } from "@liveblocks/react-ui";
import { useState } from "react";
import { Title } from "@/components/NoteEditor/Title";
import { CrossIcon, ImageIcon } from "@/icons";
import { Button } from "@/primitives/Button";
import { EmojiPicker } from "@/primitives/EmojiPicker";
import { Popover } from "@/primitives/Popover";
import styles from "./NoteHeader.module.css";

export function NoteHeader({ editor }: { editor: BlockNoteEditor | null }) {
  return (
    <div className={styles.noteHeader}>
      <Cover />
      <EmojiAndButtons />
      <Title editor={editor} />
    </div>
  );
}

// Use Liveblocks Storage to set/read real-time properties for cover colours and emoji icons
function EmojiAndButtons() {
  const cover = useStorage((root) => root.cover);
  const icon = useStorage((root) => root.icon);
  const canWrite = useSelf((me) => me.canWrite);

  const [coverPopoverOpen, setCoverPopoverOpen] = useState(false);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const isPopoverOpen = coverPopoverOpen || emojiPopoverOpen;

  const setCover = useMutation(({ storage }, newColor: string | null) => {
    storage.set("cover", newColor);
  }, []);

  const setIcon = useMutation(({ storage }, newIcon: string | null) => {
    storage.set("icon", newIcon);
  }, []);

  if (!canWrite) {
    return (
      <div className={styles.buttonRow}>
        {icon ? <div className={styles.readOnlyIcon}>{icon}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={styles.buttonRow}
      data-icon={icon !== null || undefined}
      data-popover-open={isPopoverOpen || undefined}
    >
      <Popover
        open={emojiPopoverOpen}
        onOpenChange={setEmojiPopoverOpen}
        content={
          <EmojiPicker
            onEmojiSelect={(emoji) => {
              setIcon(emoji);
              setEmojiPopoverOpen(false);
            }}
            buttonSlot={
              <button
                className={styles.buttonRemove}
                onClick={() => {
                  setIcon(null);
                  setEmojiPopoverOpen(false);
                }}
              >
                <CrossIcon style={{ width: 24, height: 24 }} />
                <span className="sr-only">Remove icon</span>
              </button>
            }
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
            onClick={() => setEmojiPopoverOpen(true)}
            className={styles.buttonRowButton}
          >
            Add icon
          </Button>
        )}
      </Popover>
      <Popover
        open={coverPopoverOpen}
        onOpenChange={setCoverPopoverOpen}
        content={
          <div className={styles.coverPopover}>
            {COVER_COLORS.map((color) => (
              <button
                key={color}
                className={styles.coverPopoverItem}
                style={{
                  backgroundColor: color,
                }}
                onClick={() => {
                  setCover(color);
                  setCoverPopoverOpen(false);
                }}
                data-active={cover === color || undefined}
              >
                <span className="sr-only">Change colour to {color}</span>
              </button>
            ))}
            <button
              className={styles.buttonRemove}
              onClick={() => {
                setCover(null);
                setCoverPopoverOpen(false);
              }}
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
          onClick={() => setCoverPopoverOpen(true)}
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
  const icon = useStorage((root) => root.icon);

  if (!cover) {
    return icon ? <div className={styles.justIcon} /> : null;
  }

  return <div style={{ backgroundColor: cover }} className={styles.cover} />;
}

const COVER_COLORS = [
  "oklch(0.645 0.246 16.439)",
  "oklch(0.705 0.213 47.604)",
  "oklch(0.795 0.184 86.047)",
  "oklch(0.723 0.219 149.579)",
  "oklch(0.685 0.169 237.323)",
  "oklch(0.606 0.25 292.717)",
  "oklch(0.554 0.046 257.417)",
];
