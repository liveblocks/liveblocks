import { Editor } from "@tiptap/react";
import styles from "./WordCount.module.css";

type Props = {
  editor: Editor;
};

export function WordCount({ editor }: Props) {
  return (
    <div className={styles.wordCount}>
      {editor.storage.characterCount.words()} words,{" "}
      {editor.storage.characterCount.characters()} characters
    </div>
  );
}
