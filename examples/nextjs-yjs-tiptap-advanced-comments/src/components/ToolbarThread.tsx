import { Editor } from "@tiptap/react";
import { Button } from "@/primitives/Button";
import styles from "./Toolbar.module.css";
import { CommentIcon } from "@/icons";

type Props = {
  editor: Editor;
};

const color = "coral";

export function ToolbarThread({ editor }: Props) {
  return (
    <>
      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() =>
          editor.chain().focus().toggleCommentHighlight({ color }).run()
        }
        disabled={
          !editor.can().chain().focus().toggleCommentHighlight({ color }).run()
        }
        data-active={
          editor.isActive("commentHighlight") ? "is-active" : undefined
        }
        aria-label="Add comment"
      >
        <CommentIcon />
      </Button>
    </>
  );
}
