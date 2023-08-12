import { Button } from "../../primitives/Button";
import styles from "./Toolbar.module.css";
import { BoldIcon } from "../../icons/Bold";
import { ItalicIcon } from "../../icons/Italic";
import { StrikethroughIcon } from "../../icons/Strikethrough";
import { Editor } from "@tiptap/react";
import { CodeIcon } from "../../icons/Code";

type Props = {
  editor: Editor;
};

export function InlineStyles({ editor }: Props) {
  return (
    <>
      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        data-active={editor.isActive("bold") ? "is-active" : undefined}
        aria-label="Bold"
      >
        <BoldIcon />
      </Button>

      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        data-active={editor.isActive("italic") ? "is-active" : undefined}
        aria-label="Italic"
      >
        <ItalicIcon />
      </Button>

      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        data-active={editor.isActive("strike") ? "is-active" : undefined}
        aria-label="Strikethrough"
      >
        <StrikethroughIcon />
      </Button>

      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        data-active={editor.isActive("code") ? "is-active" : undefined}
        aria-label="Strikethrough"
      >
        <CodeIcon />
      </Button>
    </>
  );
}
