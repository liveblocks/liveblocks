import {
  autoUpdate,
  type DetectOverflowOptions,
  flip,
  hide,
  inline,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
  type UseFloatingOptions,
} from "@floating-ui/react-dom";
import { type Editor, isTextSelection, useEditorState } from "@tiptap/react";
import type { ComponentProps } from "react";
import React, {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type FloatingPosition = "top" | "bottom";

export interface FloatingToolbarProps extends ComponentProps<"div"> {
  editor: Editor | null;
  position?: FloatingPosition;
}

export const FLOATING_TOOLBAR_COLLISION_PADDING = 10;
export const FLOATING_TOOLBAR_SIDE_OFFSET = 6;

export const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  ({ position = "top", editor, ...props }, forwardedRef) => {
    const [isPointerDown, setPointerDown] = useState(false);
    const isFocused =
      useEditorState({
        editor,
        equalityFn: Object.is,
        selector: (ctx) => ctx.editor?.isFocused ?? false,
      }) ?? false;
    const isEditable =
      useEditorState({
        editor,
        equalityFn: Object.is,
        selector: (ctx) => ctx.editor?.isEditable ?? false,
      }) ?? false;
    const hasSelectionRange =
      useEditorState({
        editor,
        equalityFn: Object.is,
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
      }) ?? false;
    const isOpen = isFocused && !isPointerDown && hasSelectionRange;
    const floatingOptions: UseFloatingOptions = useMemo(() => {
      const detectOverflowOptions: DetectOverflowOptions = {
        padding: FLOATING_TOOLBAR_COLLISION_PADDING,
      };

      return {
        strategy: "fixed",
        placement: position,
        middleware: [
          inline(detectOverflowOptions),
          flip({ ...detectOverflowOptions, crossAxis: false }),
          hide(detectOverflowOptions),
          shift({
            ...detectOverflowOptions,
            limiter: limitShift(),
          }),
          offset(FLOATING_TOOLBAR_SIDE_OFFSET),
          size({
            ...detectOverflowOptions,
            apply({ availableWidth, availableHeight, elements }) {
              elements.floating.style.setProperty(
                "--lb-composer-floating-available-width",
                `${availableWidth}px`
              );
              elements.floating.style.setProperty(
                "--lb-composer-floating-available-height",
                `${availableHeight}px`
              );
            },
          }),
        ],
        whileElementsMounted: (...args) => {
          return autoUpdate(...args, {
            animationFrame: true,
          });
        },
      };
    }, [position]);

    const {
      refs: { setReference, setFloating },
      strategy,
      x,
      y,
      isPositioned,
    } = useFloating({
      ...floatingOptions,
      open: isOpen,
    });

    useEffect(() => {
      if (!editor || !isEditable) {
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
    }, [editor, isEditable]);

    useLayoutEffect(() => {
      if (!editor || !isOpen) {
        return;
      }

      const updateSelectionReference = () => {
        const domSelection = window.getSelection();

        if (
          editor.state.selection.empty ||
          !domSelection ||
          !domSelection.rangeCount
        ) {
          setReference(null);
        } else {
          const domRange = domSelection.getRangeAt(0);

          setReference(domRange);
        }
      };

      editor.on("selectionUpdate", updateSelectionReference);
      updateSelectionReference();

      return () => {
        editor.off("selectionUpdate", updateSelectionReference);
      };
    }, [editor, isOpen, setReference]);

    if (!editor || !isOpen) {
      return null;
    }

    return createPortal(
      <div
        className="lb-root lb-portal lb-elevation lb-tiptap-floating lb-tiptap-floating-toolbar"
        ref={setFloating}
        style={{
          position: strategy,
          top: 0,
          left: 0,
          transform: isPositioned
            ? `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
            : "translate3d(0, -200%, 0)",
          minWidth: "max-content",
        }}
      >
        <div ref={forwardedRef} {...props}>
          Floating Toolbar
        </div>
      </div>,
      document.body
    );
  }
);
