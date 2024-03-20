import { Editor } from "@tiptap/react";
import { ToolbarInlineAdvanced } from "./TextInlineAdvanced";
import { ToolbarAlignment } from "./ToolbarAlignment";
import { ToolbarBlock } from "./ToolbarBlock";
import { ToolbarCommands } from "./ToolbarCommands";
import { ToolbarHeadings } from "./ToolbarHeadings";
import { ToolbarInline } from "./ToolbarInline";
import { ToolbarMedia } from "./ToolbarMedia";
import { ToolbarThread } from "./ToolbarThread";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor;
};

export function Toolbar({ editor }: Props) {
  return (
    <div className={styles.toolbar}>
      <ToolbarCommands editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarHeadings editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarInline editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarInlineAdvanced editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarAlignment editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarBlock editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarMedia editor={editor} />
      <div className={styles.toolbarSeparator} />
      <ToolbarThread editor={editor} />
    </div>
  );
}
