"use client";

import { Editor } from "@tiptap/react";
import { useCallback, useRef } from "react";
import { CommentIcon } from "@/icons";
import { Button } from "@/primitives/Button";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor | null;
};

export function ToolbarThread({ editor }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(async () => {
    editor?.chain().focus().addPendingComment().run();
  }, [editor]);

  return (
    <div ref={wrapper}>
      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={handleClick}
        disabled={editor?.isActive("lb-comment")}
        data-active={editor?.isActive("lb-comment") ? "is-active" : undefined}
        aria-label="Add comment"
      >
        <CommentIcon />
      </Button>
    </div>
  );
}
