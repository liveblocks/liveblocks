import { type Editor, isTextSelection, useEditorState } from "@tiptap/react";
import type { ComponentProps } from "react";
import React, { forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface FloatingToolbarProps extends ComponentProps<"div"> {
  editor: Editor | null;
}

export const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  ({ editor }, forwardedRef) => {
    const [isPointerDown, setPointerDown] = useState(false);
    const isFocused = useEditorState({
      editor,
      selector: (ctx) => ctx.editor?.isFocused,
    });
    const isEditable = useEditorState({
      editor,
      selector: (ctx) => ctx.editor?.isEditable,
    });
    const hasSelectionRange = useEditorState({
      editor,
      selector: (ctx) => {
        const editor = ctx.editor;

        if (!editor) {
          return false;
        }

        const { doc, selection } = editor.state;
        const { empty, ranges } = selection;
        const from = Math.min(...ranges.map((range) => range.$from.pos));
        const to = Math.max(...ranges.map((range) => range.$to.pos));

        if (empty) {
          return false;
        }

        return (
          isTextSelection(selection) && doc.textBetween(from, to).length > 0
        );
      },
    });

    useEffect(() => {
      if (!editor || !isFocused || !isEditable) {
        return;
      }

      const handlePointerDown = () => setPointerDown(true);
      const handlePointerUp = () => setPointerDown(false);

      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("pointerup", handlePointerUp);

      return () => {
        document.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("pointerup", handlePointerUp);
      };
    }, [editor, isEditable, isFocused]);

    if (!editor) {
      return null;
    }

    console.log({
      hasSelectionRange,
      isPointerDown,
    });

    return createPortal(
      <div className="lb-root lb-portal lb-elevation lb-tiptap-floating lb-tiptap-floating-toolbar">
        <div ref={forwardedRef}>Floating toolbar</div>
      </div>,
      document.body
    );
  }
);
