import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Editor, Path, Range, Transforms } from "slate";
import { useFocused, useSlate } from "slate-react";
import ToggleButton from "./ToggleButton";
import Select from "./Select";
import Tooltip from "./Tooltip";
import styles from "./Toolbar.module.css";
import BoldIcon from "../icons/bold.svg";
import ItalicIcon from "../icons/italic.svg";
import UnderlineIcon from "../icons/underline.svg";
import StrikethroughIcon from "../icons/strikethrough.svg";
import { toggleMark, topLevelPath } from "../utils";
import { BlockType, CustomElement, TextBlock } from "../types";

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
      Range.includes(selection, [0]) || // If the selection overlap with the title, do not show the toolbar
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ""
    ) {
      el.removeAttribute("style");
      return;
    }

    const domSelection = window.getSelection();
    if (domSelection == null || domSelection.rangeCount === 0) {
      return;
    }

    const domRange = domSelection.getRangeAt(0);
    const rect = domRange.getBoundingClientRect();

    el.style.position = "absolute";
    el.style.opacity = "1";
    el.style.top = `${rect.top + window.scrollY}px`;
    el.style.left = `${rect.left + window.scrollX}px`;
  });

  const type = getSelectedElementType(editor);

  const marks = Editor.marks(editor);

  return createPortal(
    <div
      ref={ref}
      className={styles.toolbar}
      onMouseDown={(e) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault();
      }}
    >
      {type && (
        <>
          <div className={styles.tag_selector}>
            <Select
              defaultValue={BlockType.Paragraph}
              value={type}
              items={[
                { label: "Normal text", value: BlockType.Paragraph },
                { label: "Heading 1", value: BlockType.H1 },
                { label: "Heading 2", value: BlockType.H2 },
                { label: "Heading 3", value: BlockType.H3 },
                { label: "Bulleted list", value: BlockType.BulletedList },
                { label: "To-do list", value: BlockType.ToDo },
              ]}
              onValueChange={(value: string) => {
                if (editor.selection == null) {
                  return;
                }

                // TODO: Update Select typings to infer value type from items
                const type = value as TextBlock;
                Transforms.setNodes<CustomElement>(
                  editor,
                  {
                    type,
                  },
                  {
                    at: [editor.selection.anchor.path[0]],
                  }
                );
              }}
            />
          </div>
          <div className={styles.separator} />
        </>
      )}

      <div className={styles.group}>
        <Tooltip content="Toggle Bold">
          <ToggleButton
            ariaLabel="Toggle Bold"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "bold")}
            isSquare
            isActive={marks ? marks["bold"] === true : false}
          >
            <BoldIcon />
          </ToggleButton>
        </Tooltip>
        <Tooltip content="Toggle Italic">
          <ToggleButton
            ariaLabel="Toggle Italic"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "italic")}
            isSquare
            isActive={marks ? marks["italic"] === true : false}
          >
            <ItalicIcon />
          </ToggleButton>
        </Tooltip>
        <Tooltip content="Toggle Underline">
          <ToggleButton
            ariaLabel="Toggle Underline"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "underline")}
            isSquare
            isActive={marks ? marks["underline"] === true : false}
          >
            <UnderlineIcon />
          </ToggleButton>
        </Tooltip>
        <Tooltip content="Toggle Strikethrough">
          <ToggleButton
            ariaLabel="Toggle Strikethrough"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => toggleMark(editor, "strikeThrough")}
            isSquare
            isActive={marks ? marks["strikeThrough"] === true : false}
          >
            <StrikethroughIcon />
          </ToggleButton>
        </Tooltip>
      </div>
    </div>,
    document.body
  );
}

function getSelectedElementType(editor: Editor): TextBlock | null {
  if (editor.selection == null) {
    return null;
  }

  // If selection overlap on multiple top element, return null
  if (
    Path.compare(
      topLevelPath(editor.selection.anchor.path),
      topLevelPath(editor.selection.focus.path)
    ) !== 0
  ) {
    return null;
  }

  const element = editor.children[
    editor.selection.anchor.path[0]
  ] as CustomElement;

  if (!isTextElementType(element.type)) {
    return null;
  }

  return element.type;
}

function isTextElementType(type: string): type is TextBlock {
  return (
    type === BlockType.H1 ||
    type === BlockType.H2 ||
    type === BlockType.H3 ||
    type === BlockType.Paragraph ||
    type === BlockType.BulletedList ||
    type === BlockType.ToDo
  );
}
