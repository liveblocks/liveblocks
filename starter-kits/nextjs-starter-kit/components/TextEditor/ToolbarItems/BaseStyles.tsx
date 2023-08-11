import { Button } from "../../../primitives/Button";
import styles from "../Toolbar.module.css";
import { BoldIcon } from "../../../icons/Bold";
import { ItalicIcon } from "../../../icons/Italic";
import { StrikethroughIcon } from "../../../icons/Strikethrough";
import { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
};

export function BaseStyles({ editor }: Props) {
  return (
    <>
      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        data-active={editor.isActive("bold") ? "is-active" : undefined}
        aria-label="bold"
      >
        <BoldIcon />
      </Button>

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        data-active={editor.isActive("italic") ? "is-active" : undefined}
        aria-label="italic"
      >
        <ItalicIcon />
      </Button>

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        data-active={editor.isActive("strike") ? "is-active" : undefined}
        aria-label="strikethrough"
      >
        <StrikethroughIcon />
      </Button>
    </>
  );
}
