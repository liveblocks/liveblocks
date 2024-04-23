"use client";

import { Editor } from "@tiptap/react";
import { nanoid } from "nanoid";
import { useCallback, useRef } from "react";
import { CommentIcon } from "@/icons";
import { Button } from "@/primitives/Button";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor;
};

export function ToolbarThread({ editor }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(async () => {
    editor
      .chain()
      .focus()
      .setCommentHighlight({
        highlightId: nanoid(),
        state: "composing",
      })
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
