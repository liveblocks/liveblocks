"use client";

import type { LiveTextAttributes } from "@liveblocks/client";
import type { CSSProperties } from "react";
import { LiveCarets } from "./live-carets";
import { Toolbar } from "./toolbar";
import { useLiveTextEditor } from "./use-live-text-editor";

// A collaborative text editor built on the LiveText primitive and a plain contenteditable
// We generally recommend using a rich-text editor framework such aas Tiptap, BlockNote, Lexical, etc.
// This is an example of a way you could construct your own using LiveText and presence.
export function Editor() {
  const {
    editorRef,
    text,
    selection,
    historyBatchActive,
    endHistoryBatch,
    toggleFormat,
  } = useLiveTextEditor();

  const plainText = text.map(([segmentText]) => segmentText).join("");

  return (
    <div className="editor-container">
      <Toolbar
        text={text}
        selection={selection}
        historyBatchActive={historyBatchActive}
        onHistoryAction={endHistoryBatch}
        onToggleFormat={toggleFormat}
      />
      <div className="editor-wrapper">
        <div
          ref={editorRef}
          className="editor"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          role="textbox"
          aria-multiline="true"
        >
          {text.length === 0 ? (
            <br />
          ) : (
            text.map(([segmentText, attributes], index) => (
              <span key={index} style={getSegmentStyle(attributes)}>
                {segmentText}
              </span>
            ))
          )}
          {/* A trailing newline needs an extra <br> to render as a line */}
          {plainText.endsWith("\n") ? <br /> : null}
        </div>
        <LiveCarets editorRef={editorRef} text={text} />
      </div>
    </div>
  );
}

function getSegmentStyle(
  attributes: LiveTextAttributes | undefined
): CSSProperties | undefined {
  if (!attributes) {
    return undefined;
  }

  return {
    fontWeight: attributes.bold ? 700 : undefined,
    fontStyle: attributes.italic ? "italic" : undefined,
    textDecoration: attributes.strikethrough ? "line-through" : undefined,
  };
}
