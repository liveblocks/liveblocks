import { Editor } from "@tiptap/react";
import styles from "./Toolbar.module.css";
import { Button } from "../../primitives/Button";
import { BoldIcon } from "../../icons/Bold";
import { ItalicIcon } from "../../icons/Italic";
import { StrikethroughIcon } from "../../icons/Strikethrough";
import { Select } from "../../primitives/Select";
import { useCallback } from "react";

type Props = {
  editor: Editor | null;
};

const headings = [
  { value: "p", title: "Paragraph" },
  { value: "h1", title: "Heading 1" },
  { value: "h2", title: "Heading 2" },
  { value: "h3", title: "Heading 3" },
];

export function Toolbar({ editor }: Props) {
  const onHeadingChange = useCallback(
    (value: string) => {
      if (!editor) {
        return;
      }

      switch (value) {
        case "p":
          editor.chain().focus().setParagraph().run();
          break;

        case "h1":
          editor.chain().focus().setHeading({ level: 1 }).run();
          break;

        case "h2":
          editor.chain().focus().setHeading({ level: 2 }).run();
          break;

        case "h3":
          editor.chain().focus().setHeading({ level: 3 }).run();
          break;
      }
    },
    [editor]
  );

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.toolbar}>
      <Select
        value={getCurrentHeading(editor)}
        initialValue={headings[0].value}
        items={headings}
        onChange={onHeadingChange}
      />
      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        data-active={editor.isActive("bold") ? "is-active" : undefined}
        aria-label="bold"
      >
        <BoldIcon />
      </Button>

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        data-active={editor.isActive("italic") ? "is-active" : undefined}
        aria-label="italic"
      >
        <ItalicIcon />
      </Button>

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        data-active={editor.isActive("strike") ? "is-active" : undefined}
        aria-label="strikethrough"
      >
        <StrikethroughIcon />
      </Button>

      <Button
        className={styles.toolbarButton}
        variant="subtle"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={!editor.can().chain().focus().toggleBlockquote().run()}
        data-active={editor.isActive("blockquote") ? "is-active" : undefined}
        aria-label="blockquote"
      >
        <div style={{ fontSize: "35px", padding: "13px 2px 0 2px" }}>”</div>
      </Button>
    </div>
  );
}

function getCurrentHeading(editor: Editor) {
  if (editor.isActive("heading", { level: 1 })) {
    return "h1";
  }

  if (editor.isActive("heading", { level: 2 })) {
    return "h2";
  }

  if (editor.isActive("heading", { level: 3 })) {
    return "h3";
  }

  return "p";
}
