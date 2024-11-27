"use client";

import { useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { nanoid } from "nanoid";
import { Button } from "@/components/Button";
import { CommentIcon } from "@/icons";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor;
};

export function ToolbarThread({ editor }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(async () => {
    editor.chain().focus().addPendingComment().run();
  }, [editor]);

  return (
    <div ref={wrapper}>
      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={handleClick}
        disabled={editor.isActive("lb-comment")}
        data-active={editor.isActive("lb-comment") ? "is-active" : undefined}
        aria-label="Add comment"
      >
        <CommentIcon />
      </Button>
    </div>
  );
}
