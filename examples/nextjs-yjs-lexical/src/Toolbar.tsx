import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND } from "lexical";
import styles from "./Toolbar.module.css";

export function Toolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className={styles.toolbar}>
      <button
        className={styles.buttonBold}
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        }}
        aria-label="Format bold"
      >
        B
      </button>
      <button
        className={styles.buttonItalic}
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        }}
        aria-label="Format italic"
      >
        i
      </button>
      <button
        className={styles.buttonUnderline}
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
        }}
        aria-label="Format underline"
      >
        u
      </button>
    </div>
  );
}
