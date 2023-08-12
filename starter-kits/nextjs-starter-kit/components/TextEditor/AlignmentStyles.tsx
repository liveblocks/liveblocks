import { Button } from "../../primitives/Button";
import styles from "./Toolbar.module.css";
import { ItalicIcon } from "../../icons/Italic";
import { Editor } from "@tiptap/react";
import { AlignLeftIcon } from "../../icons/AlignLeft";
import { AlignCenterIcon } from "../../icons/AlignCenter";
import { AlignRightIcon } from "../../icons/AlignRight";
import { AlignJustifyIcon } from "../../icons/AlignJustify";

type Props = {
  editor: Editor;
};

export function AlignmentStyles({ editor }: Props) {
  return (
    <>
      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        disabled={!editor.can().chain().focus().setTextAlign("left").run()}
        data-active={
          editor.isActive({ textAlign: "left" }) ? "is-active" : undefined
        }
        aria-label="align left"
      >
        <AlignLeftIcon />
      </Button>

      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        disabled={!editor.can().chain().focus().setTextAlign("center").run()}
        data-active={
          editor.isActive({ textAlign: "center" }) ? "is-active" : undefined
        }
        aria-label="align center"
      >
        <AlignCenterIcon />
      </Button>

      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        disabled={!editor.can().chain().focus().setTextAlign("right").run()}
        data-active={
          editor.isActive({ textAlign: "right" }) ? "is-active" : undefined
        }
        aria-label="align right"
      >
        <AlignRightIcon />
      </Button>

      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        disabled={!editor.can().chain().focus().setTextAlign("justify").run()}
        data-active={
          editor.isActive({ textAlign: "justify" }) ? "is-active" : undefined
        }
        aria-label="justify"
      >
        <AlignJustifyIcon />
      </Button>
    </>
  );
}
