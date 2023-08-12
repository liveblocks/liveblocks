import { Editor } from "@tiptap/react";
import styles from "./Toolbar.module.css";
import { Headings } from "./Headings";
import { InlineStyles } from "./InlineStyles";
import { BlockStyles } from "./BlockStyles";
import { AlignmentStyles } from "./AlignmentStyles";

type Props = {
  editor: Editor;
};

export function Toolbar({ editor }: Props) {
  return (
    <div className={styles.toolbar}>
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
