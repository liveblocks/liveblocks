import { Toolbar } from "@liveblocks/react-tiptap";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import { CrossIcon, HighlightIcon, LinkIcon } from "@/icons";
import { Button } from "@/primitives/Button";
import { Input } from "@/primitives/Input";
import { Popover } from "@/primitives/Popover";
import styles from "./Toolbar.module.css";

type Props = {
  editor: Editor | null;
};

export function ToolbarInlineAdvanced({ editor }: Props) {
  function toggleLink(link: string) {
    editor?.chain().focus().toggleLink({ href: link }).run();
  }

  return (
    <>
      <Toolbar.Toggle
        name="Highlight"
        icon={<HighlightIcon style={{ width: "17.5px" }} />}
        active={editor?.isActive("highlight") ?? false}
        onClick={() => editor?.chain().focus().toggleHighlight().run()}
        disabled={!editor?.can().chain().focus().toggleHighlight().run()}
      />

      <Popover
        content={
          <LinkPopover
            onSubmit={toggleLink}
            onRemoveLink={toggleLink}
            showRemove={editor?.getAttributes("link").href}
          />
        }
      >
        <Toolbar.Toggle
          name="Link"
          icon={<LinkIcon style={{ width: "17px" }} />}
          active={editor?.isActive("link") ?? false}
          disabled={!editor?.can().chain().focus().setLink({ href: "" }).run()}
        />
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
