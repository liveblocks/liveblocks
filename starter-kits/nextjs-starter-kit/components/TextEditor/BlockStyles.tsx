import { Button } from "../../primitives/Button";
import styles from "./Toolbar.module.css";
import { Editor } from "@tiptap/react";
import { ListUnorderedIcon } from "../../icons/ListUnordered";

type Props = {
  editor: Editor;
};

export function BlockStyles({ editor }: Props) {
  return (
    <>
      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
        data-active={editor.isActive("bulletList") ? "is-active" : undefined}
        aria-label="unordered list"
      >
        <ListUnorderedIcon />
      </Button>

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={!editor.can().chain().focus().toggleOrderedList().run()}
        data-active={editor.isActive("orderedList") ? "is-active" : undefined}
        aria-label="ordered list"
      >
        <ListUnorderedIcon />
      </Button>

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

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
        data-active={editor.isActive("codeBlock") ? "is-active" : undefined}
        aria-label="code block"
      >
        <div>{"</>"}</div>
      </Button>
    </>
  );
}
