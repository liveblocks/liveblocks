import { BubbleMenu, Editor } from "@tiptap/react";
import { ToolbarInlineAdvanced } from "./TextInlineAdvanced";
import { ToolbarInline } from "./ToolbarInline";
import { ToolbarThread } from "./ToolbarThread";
import styles from "./TextEditor.module.css";

type Props = {
  editor: Editor;
};

export function SelectionMenu({ editor }: Props) {
  return (
    <BubbleMenu editor={editor} tippyOptions={{ zIndex: 99 }}>
      {shouldShowBubbleMenu(editor) ? (
        <div className={styles.bubbleMenuWrapper}>
          <ToolbarInline editor={editor} />
          <ToolbarInlineAdvanced editor={editor} />
          <ToolbarThread editor={editor} />
        </div>
      ) : null}
    </BubbleMenu>
  );
}

export function shouldShowBubbleMenu(editor: Editor) {
  const canBold = editor.can().chain().focus().toggleBold().run();
  const canItalic = editor.can().chain().focus().toggleItalic().run();
  const canStrike = editor.can().chain().focus().toggleStrike().run();
  const canCode = editor.can().chain().focus().toggleCode().run();
  return canBold || canItalic || canStrike || canCode;
}
