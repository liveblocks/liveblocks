import { Editor } from "@tiptap/react";
import styles from "./Toolbar.module.css";
import { Headings } from "./Headings";
import { InlineStyles } from "./InlineStyles";
import { BlockStyles } from "./BlockStyles";
import { AlignmentStyles } from "./AlignmentStyles";
import { Commands } from "./Commands";

type Props = {
  editor: Editor;
};

export function Toolbar({ editor }: Props) {
  return (
    <div className={styles.toolbar}>
      <Commands editor={editor} />
      <div className={styles.toolbarSeparator} />
      <Headings editor={editor} />
      <div className={styles.toolbarSeparator} />
      <InlineStyles editor={editor} />
      <div className={styles.toolbarSeparator} />
      <BlockStyles editor={editor} />
      <div className={styles.toolbarSeparator} />
      <AlignmentStyles editor={editor} />
    </div>
  );
}
