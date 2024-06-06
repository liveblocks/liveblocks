import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import { createDOMRange } from "./create-dom-range";
import styles from "./FloatingToolbarPlugin.module.css";

export function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const [range, setRange] = useState<Range | null>(null);

  useEffect(() => {
    editor.registerUpdateListener(() => {
      return editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          setRange(null);
          return;
        }

        const { anchor, focus } = selection;

        const range = createDOMRange(
          editor,
          anchor.getNode(),
          anchor.offset,
          focus.getNode(),
          focus.offset
        );

        setRange(range);
      });
    });
  }, [editor]);

  if (range === null) return null;

  const root = editor.getRootElement();
  if (root === null) return null;

  const parent = root.offsetParent;
  if (parent === null) return null;

  return createPortal(
    <FloatingToolbar range={range} container={parent} />,
    parent
  );
}

function FloatingToolbar({
  range,
  container,
}: {
  range: Range;
  container: Element;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);

  const alignOffset = 10;
  const sideOffset = 10;
  const collisionPadding = 20;

  useEffect(() => {
    if (range === null) return;

    const content = divRef.current;
    if (content === null) return;

    // Get the bounding client rect of the DOM (selection) range
    const rect = range.getBoundingClientRect();

    // Set the position of the floating container
    let left =
      rect.left - container.getBoundingClientRect().left + container.scrollLeft;

    // Apply the align offset
    left += alignOffset;

    // Get the width of the content
    const width = content.getBoundingClientRect().width;
    left = left + rect.width / 2 - width / 2;

    // Ensure content does not overflow the container
    if (left <= collisionPadding) {
      left = collisionPadding;
    } else if (
      left + width >=
      container.getBoundingClientRect().width - collisionPadding
    ) {
      left = container.getBoundingClientRect().width - width - collisionPadding;
    }

    let top =
      rect.bottom - container.getBoundingClientRect().top + container.scrollTop;

    // Apply the side offset
    top += sideOffset;

    // Get the height of the content
    const height = content.getBoundingClientRect().height;

    if (rect.bottom + height >= window.innerHeight - collisionPadding) {
      top =
        rect.top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        height;
      top -= sideOffset;
    }

    content.style.left = `${left}px`;
    content.style.top = `${top}px`;
  }, [range]);

  return (
    <div ref={divRef} style={{ position: "absolute", top: 0, left: 0 }}>
      <Toolbar />
    </div>
  );
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className={styles.toolbar}>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        className={styles.toolbarItem}
      >
        <BoldIcon />
      </button>

      <button
        onClick={() =>
          editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined)
        }
        className={styles.toolbarItem}
      >
        <CommentIcon />
      </button>
    </div>
  );
}

function BoldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.25 25H9V7H17.5C18.5022 7.00006 19.4834 7.28695 20.3277 7.82679C21.172 8.36662 21.8442 9.13684 22.2649 10.0465C22.6855 10.9561 22.837 11.9671 22.7015 12.96C22.5659 13.953 22.149 14.8864 21.5 15.65C22.3477 16.328 22.9645 17.252 23.2653 18.295C23.5662 19.3379 23.5364 20.4485 23.18 21.4738C22.8236 22.4991 22.1581 23.3887 21.2753 24.0202C20.3924 24.6517 19.3355 24.994 18.25 25ZM12 22H18.23C18.5255 22 18.8181 21.9418 19.091 21.8287C19.364 21.7157 19.6121 21.5499 19.821 21.341C20.0299 21.1321 20.1957 20.884 20.3087 20.611C20.4218 20.3381 20.48 20.0455 20.48 19.75C20.48 19.4545 20.4218 19.1619 20.3087 18.889C20.1957 18.616 20.0299 18.3679 19.821 18.159C19.6121 17.9501 19.364 17.7843 19.091 17.6713C18.8181 17.5582 18.5255 17.5 18.23 17.5H12V22ZM12 14.5H17.5C17.7955 14.5 18.0881 14.4418 18.361 14.3287C18.634 14.2157 18.8821 14.0499 19.091 13.841C19.2999 13.6321 19.4657 13.384 19.5787 13.111C19.6918 12.8381 19.75 12.5455 19.75 12.25C19.75 11.9545 19.6918 11.6619 19.5787 11.389C19.4657 11.116 19.2999 10.8679 19.091 10.659C18.8821 10.4501 18.634 10.2843 18.361 10.1713C18.0881 10.0582 17.7955 10 17.5 10H12V14.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
