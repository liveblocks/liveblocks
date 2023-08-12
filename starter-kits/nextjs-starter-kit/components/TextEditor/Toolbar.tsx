import { Editor } from "@tiptap/react";
import styles from "./Toolbar.module.css";
import { Headings } from "./ToolbarHeadings";
import { ToolbarInline } from "./ToolbarInline";
import { ToolbarBlock } from "./ToolbarBlock";
import { ToolbarAlignment } from "./ToolbarAlignment";
import { ToolbarCommands } from "./ToolbarCommands";
import { ToolbarMedia } from "./ToolbarMedia";

type Props = {
  editor: Editor;
};

export function Toolbar({ editor }: Props) {
  return (
    <div className={styles.toolbar}>
      <ToolbarCommands editor={editor} />
      <div className={styles.toolbarSeparator} />
      <Headings editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarInline editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarAlignment editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarBlock editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarMedia editor={editor} />
    </div>
  );
}
