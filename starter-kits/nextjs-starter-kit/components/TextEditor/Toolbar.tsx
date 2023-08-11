import { Editor } from "@tiptap/react";
import styles from "./Toolbar.module.css";
import { Button } from "../../primitives/Button";
import { Headings } from "./ToolbarItems/Headings";
import { BaseStyles } from "./ToolbarItems/BaseStyles";

type Props = {
  editor: Editor | null;
};

export function Toolbar({ editor }: Props) {
  if (!editor) {
    return null;
  }

  return (
    <div className={styles.toolbar}>
      <Headings editor={editor} />

      <div className={styles.toolbarSeparator} />

      <BaseStyles editor={editor} />

      <div className={styles.toolbarSeparator} />

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={!editor.can().chain().focus().toggleBlockquote().run()}
        data-active={editor.isActive("blockquote") ? "is-active" : undefined}
        aria-label="blockquote"
      >
        <div style={{ fontSize: "35px", padding: "13px 2px 0 2px" }}>”</div>
      </Button>
    </div>
  );
}
