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
import { useRefs } from "@liveblocks/react-ui/_private";
import { type Editor, isTextSelection, useEditorState } from "@tiptap/react";
import type {
  ComponentProps,
  ComponentType,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type FloatingPosition = "top" | "bottom";

interface FloatingToolbarSlotProps {
  editor: Editor;
}

type FloatingToolbarSlot = ReactNode | ComponentType<FloatingToolbarSlotProps>;

export interface FloatingToolbarProps
  extends Omit<ComponentProps<"div">, "children"> {
  editor: Editor | null;
  position?: FloatingPosition;
  offset?: number;
  children?: FloatingToolbarSlot;
  leading?: FloatingToolbarSlot;
  trailing?: FloatingToolbarSlot;
}

export const FLOATING_TOOLBAR_COLLISION_PADDING = 10;

function applySlot(
  slot: FloatingToolbarSlot,
  props: FloatingToolbarSlotProps
): ReactNode {
  if (typeof slot === "function") {
    const Component = slot;

    return <Component {...props} />;
  }

  return slot;
}

function DefaultFloatingToolbarChildren() {
  return <>Main</>;
}

export const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  (
    {
      children = <DefaultFloatingToolbarChildren />,
      leading,
      trailing,
      position = "top",
      offset: sideOffset = 6,
      editor,
      onPointerDown,
      ...props
    },
    forwardedRef
  ) => {
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
          offset(sideOffset),
          size(detectOverflowOptions),
        ],
        whileElementsMounted: (...args) => {
          return autoUpdate(...args, {
            animationFrame: true,
          });
        },
      };
    }, [position, sideOffset]);
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
    const mergedRefs = useRefs(forwardedRef, setFloating);

    const handlePointerDown = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerDown?.(event);

        event.preventDefault();
        event.stopPropagation();
      },
      [onPointerDown]
    );

    useEffect(() => {
      if (!editor || !isEditable) {
        return;
      }

      const handlePointerDown = (event: PointerEvent) => {
        // Ignore outer pointer events
        if (editor.view.dom.contains(event.target as Node)) {
          setPointerDown(true);
        }
      };
      const handlePointerUp = () => {
        setPointerDown(false);
      };

      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("pointercancel", handlePointerUp);
      document.addEventListener("pointerup", handlePointerUp);

      return () => {
        document.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("pointercancel", handlePointerUp);
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

      editor.on("transaction", updateSelectionReference);
      updateSelectionReference();

      return () => {
        editor.off("transaction", updateSelectionReference);
      };
    }, [editor, isOpen, setReference]);

    useEffect(() => {
      if (!editor) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          // TODO: Close the floating toolbar
          editor.commands.focus();
        }
      };

      editor.view.dom.addEventListener("keydown", handleKeyDown);

      return () => {
        editor.view.dom.removeEventListener("keydown", handleKeyDown);
      };
    }, [editor, isOpen]);

    if (!editor || !isOpen) {
      return null;
    }

    const slotProps: FloatingToolbarSlotProps = { editor };

    return createPortal(
      <div
        className="lb-root lb-portal lb-elevation lb-tiptap-floating lb-tiptap-floating-toolbar"
        ref={mergedRefs}
        style={{
          position: strategy,
          top: 0,
          left: 0,
          transform: isPositioned
            ? `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
            : "translate3d(0, -200%, 0)",
          minWidth: "max-content",
        }}
        onPointerDown={handlePointerDown}
        {...props}
      >
        {applySlot(leading, slotProps)}
        {applySlot(children, slotProps)}
        {applySlot(trailing, slotProps)}
      </div>,
      document.body
    );
  }
);
