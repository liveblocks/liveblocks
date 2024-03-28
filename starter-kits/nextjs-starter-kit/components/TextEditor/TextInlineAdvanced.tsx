import { Editor } from "@tiptap/react";
import { useState } from "react";
import { CodeIcon, CrossIcon, HighlightIcon, LinkIcon } from "@/icons";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Popover } from "@/primitives/Popover";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor;
};

export function ToolbarInlineAdvanced({ editor }: Props) {
  function toggleLink(link: string) {
    editor.chain().focus().toggleLink({ href: link }).run();
  }

  return (
    <>
      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        data-active={editor.isActive("code") ? "is-active" : undefined}
        aria-label="Code"
      >
        <CodeIcon style={{ width: "18px" }} />
      </Button>

      <Button
        variant="subtle"
        className={styles.toolbarButton}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        disabled={!editor.can().chain().focus().toggleHighlight().run()}
        data-active={editor.isActive("highlight") ? "is-active" : undefined}
        aria-label="Highlight"
      >
        <HighlightIcon style={{ width: "18px" }} />
      </Button>

      <Popover
        content={
          <LinkPopover
            onSubmit={toggleLink}
            onRemoveLink={toggleLink}
            showRemove={editor.getAttributes("link").href}
          />
        }
      >
        <Button
          variant="subtle"
          className={styles.toolbarButton}
          disabled={!editor.can().chain().focus().setLink({ href: "" }).run()}
          data-active={editor.isActive("link") ? "is-active" : undefined}
          aria-label="Link"
        >
          <LinkIcon style={{ width: "17px" }} />
        </Button>
      </Popover>
    </>
  );
}

type LinkPopoverProps = {
  onSubmit: (url: string) => void;
  onRemoveLink: (url: string) => void;
  showRemove: boolean;
};

function LinkPopover({ onSubmit, onRemoveLink, showRemove }: LinkPopoverProps) {
  const [value, setValue] = useState("");

  return (
    <form
      className={styles.toolbarPopover}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <label className={styles.toolbarPopoverLabel} htmlFor="">
        Add link to selected text
      </label>
      <div className={styles.toolbarPopoverBar}>
        <Input
          className={styles.toolbarPopoverInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {showRemove ? (
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveLink(value);
            }}
            aria-label="Remove link"
          >
            <CrossIcon />
          </Button>
        ) : null}
        <Button className={styles.toolbarPopoverButton}>Add link</Button>
      </div>
    </form>
  );
}
