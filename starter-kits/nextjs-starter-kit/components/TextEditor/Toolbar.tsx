import { Editor } from "@tiptap/react";
import styles from "./Toolbar.module.css";
import { Headings } from "./ToolbarItems/Headings";
import { InlineStyles } from "./ToolbarItems/InlineStyles";
import { BlockStyles } from "./ToolbarItems/BlockStyles";
import { AlignmentStyles } from "./ToolbarItems/AlignmentStyles";

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
      <InlineStyles editor={editor} />
      <div className={styles.toolbarSeparator} />
      <BlockStyles editor={editor} />
      <div className={styles.toolbarSeparator} />
      <AlignmentStyles editor={editor} />
    </div>
  );
}
