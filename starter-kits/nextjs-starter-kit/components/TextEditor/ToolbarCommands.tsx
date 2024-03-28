import { Editor } from "@tiptap/react";
import { RedoIcon, UndoIcon } from "@/icons";
import { Button } from "@/primitives/Button";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor;
};

export function ToolbarCommands({ editor }: Props) {
  return (
    <>
      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().undo().run()}
        disabled={!editor.can().chain().undo().run()}
        data-active={editor.isActive("bulletList") ? "is-active" : undefined}
        aria-label="Undo"
      >
        <UndoIcon />
      </Button>

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().redo().run()}
        disabled={!editor.can().chain().redo().run()}
        data-active={editor.isActive("orderedList") ? "is-active" : undefined}
        aria-label="Redo"
      >
        <RedoIcon />
      </Button>
    </>
  );
}
