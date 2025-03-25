import { BlockNoteEditor } from "@blocknote/core";
import { useMutation, useStorage } from "@liveblocks/react";
import { Title } from "@/components/NoteEditor/Title";
import styles from "./NoteHeader.module.css";
import { Button } from "@/primitives/Button";
import { useState } from "react";
import { Popover } from "@/primitives/Popover";
import { CrossIcon, HighlightIcon, ImageIcon } from "@/icons";
import { Icon } from "@liveblocks/react-ui";

export function NoteHeader({ editor }: { editor: BlockNoteEditor | null }) {
  return (
    <>
      <Cover />
      <EmojiAndButtons />
      <Title editor={editor} />
    </>
  );
}

const COLORS = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
];

function EmojiAndButtons() {
  const cover = useStorage((root) => root.cover);
  const [isCoverPopoverOpen, setIsCoverPopoverOpen] = useState(false);

  const setCover = useMutation(({ storage }, newColor: string | null) => {
    storage.set("cover", newColor);
  }, []);

  return (
    <div className={styles.buttonRow}>
      <Button
        variant="subtle"
        icon={<Icon.Emoji style={{ marginRight: -2 }} />}
      >
        Add icon
      </Button>
      <Popover
        open={isCoverPopoverOpen}
        onOpenChange={setIsCoverPopoverOpen}
        content={
          <div className={styles.coverPopover}>
            {COLORS.map((color) => (
              <button
                key={color}
                className={styles.coverPopoverItem}
                style={{ backgroundColor: color }}
                onClick={() => setCover(color)}
                data-active={cover === color}
              >
                <span className="sr-only">Change colour to {color}</span>
              </button>
            ))}
            <button
              className={styles.coverPopoverItem}
              onClick={() => setCover(null)}
              data-active={cover === null}
            >
              <CrossIcon />
              <span className="sr-only">Remove cover</span>
            </button>
          </div>
        }
      >
        <Button
          variant="subtle"
          onClick={() => setIsCoverPopoverOpen(true)}
          icon={<ImageIcon style={{ width: 18, height: 18 }} />}
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
    return null;
  }

  return <div style={{ backgroundColor: cover, height: 240 }} />;
}
