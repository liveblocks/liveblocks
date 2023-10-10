import { Editor } from "@tiptap/react";
import { Button } from "@/primitives/Button";
import styles from "./Toolbar.module.css";
import { CommentIcon } from "@/icons";
import { useCallback, useEffect, useRef } from "react";
import { nanoid } from "nanoid";

type Props = {
  editor: Editor;
};

const color = "coral";

export function ToolbarThread({ editor }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(async () => {
    editor
      .chain()
      .focus()
      .setCommentHighlight({ color, highlightId: nanoid(), state: "composing" })
      .run();
  }, [editor]);

  return (
    <div ref={wrapper}>
      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={handleClick}
        disabled={editor.isActive("commentHighlight")}
        data-active={
          editor.isActive("commentHighlight") ? "is-active" : undefined
        }
        aria-label="Add comment"
      >
        <CommentIcon />
      </Button>
    </div>
  );
}
