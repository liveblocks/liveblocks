import classNames from "classnames";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Editor, Range } from "slate";
import { useFocused, useSlate } from "slate-react";
import Button from "../components/Button";
import Select from "../components/Select";
import Tooltip from "../components/Tooltip";
import styles from "../../styles/TextEditorToolbar.module.css";
import BoldIcon from "../icons/bold.svg";
import ItalicIcon from "../icons/italic.svg";
import UnderlineIcon from "../icons/underline.svg";
import StrikethroughIcon from "../icons/strikethrough.svg";
import { toggleMark } from "./utils";

export default function Toolbar() {
  const ref = useRef<HTMLDivElement | null>(null);
  const editor = useSlate();
  const inFocus = useFocused();

  useEffect(() => {
    const el = ref.current;
    const { selection } = editor;

    if (!el) {
      return;
    }

    if (
      !selection ||
      !inFocus ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ""
    ) {
      el.removeAttribute("style");
      return;
    }

    const domSelection = window.getSelection();
    if (domSelection == null) {
      return;
    }

    const domRange = domSelection.getRangeAt(0);
    const rect = domRange.getBoundingClientRect();

    el.style.position = "absolute";
    el.style.opacity = "1";
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`;
    el.style.left = `${
      rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2
    }px`;
  });

  return createPortal(
    <div
      ref={ref}
      className={classNames(styles.toolbar, "toolbar")}
      onMouseDown={(e) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault();
      }}
    >
      {/* <div className={styles.tag_selector}>
        <Select
          defaultValue="p"
          value={selectedTagValue}
          disabled={!selectedBlockIds.length}
          items={[
            { label: "Normal text", value: "p" },
            { label: "Heading 1", value: "h1" },
            { label: "Heading 2", value: "h2" },
            { label: "Heading 3", value: "h3" },
          ]}
          onValueChange={(value) => {
          }}
        />
      </div>
      <div className={styles.separator} /> */}
      <div className={styles.group}>
        <Tooltip content="Toggle Bold">
          <Button
            type="ghost"
            ariaLabel="Toggle Bold"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "bold")}
          >
            <BoldIcon />
          </Button>
        </Tooltip>
        <Tooltip content="Toggle Italic">
          <Button
            type="ghost"
            ariaLabel="Toggle Italic"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "italic")}
          >
            <ItalicIcon />
          </Button>
        </Tooltip>
        <Tooltip content="Toggle Underline">
          <Button
            type="ghost"
            ariaLabel="Toggle Underline"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "underline")}
          >
            <UnderlineIcon />
          </Button>
        </Tooltip>
        <Tooltip content="Toggle Strikethrough">
          <Button
            type="ghost"
            ariaLabel="Toggle Strikethrough"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "strikeThrough")}
          >
            <StrikethroughIcon />
          </Button>
        </Tooltip>
      </div>
    </div>,
    document.body
  );
}
