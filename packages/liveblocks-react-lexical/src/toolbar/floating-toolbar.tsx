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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TooltipProvider, useRefs } from "@liveblocks/react-ui/_private";
import { $getSelection, $isRangeSelection } from "lexical";
import type { ComponentProps, PointerEvent as ReactPointerEvent } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { classNames } from "../classnames";
import { createDOMRange } from "../create-dom-range";
import type { FloatingPosition } from "../types";
import { useIsFocused } from "../use-is-focused";
import {
  applyToolbarSlot,
  Toolbar,
  type ToolbarSlot,
  type ToolbarSlotProps,
} from "./toolbar";

export interface FloatingToolbarProps
  extends Omit<ComponentProps<"div">, "children"> {
  position?: FloatingPosition;
  offset?: number;
  children?: ToolbarSlot;
  leading?: ToolbarSlot;
  trailing?: ToolbarSlot;
}

export const FLOATING_TOOLBAR_COLLISION_PADDING = 10;

function DefaultFloatingToolbarContent() {
  return (
    <>
      <Toolbar.SectionInline />
      <Toolbar.Separator />
      <Toolbar.SectionCollaboration />
    </>
  );
}

export const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  (
    {
      children = DefaultFloatingToolbarContent,
      leading,
      trailing,
      position = "top",
      offset: sideOffset = 6,
      onPointerDown,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const [isPointerDown, setPointerDown] = useState(false);
    const [editor] = useLexicalComposerContext();
    const isFocused = useIsFocused(editor);
    const isEditable = editor.isEditable();
    const [hasSelectionRange, setHasSelectionRange] = useState(false);

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
        if (editor._rootElement?.contains(event.target as Node)) {
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

    useEffect(() => {
      const unregister = editor.registerUpdateListener(({ tags }) => {
        return editor.getEditorState().read(() => {
          // Ignore selection updates related to collaboration
          if (tags.has("collaboration")) return;

          const selection = $getSelection();
          if (!$isRangeSelection(selection) || selection.isCollapsed()) {
            setHasSelectionRange(false);
            setReference(null);
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

          setHasSelectionRange(true);
          setReference(range);
        });
      });

      return unregister;
    }, [editor, setReference]);

    useEffect(() => {
      const root = editor._rootElement;

      if (!root) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          // TODO: Close the floating toolbar
        }
      };

      root.addEventListener("keydown", handleKeyDown);

      return () => {
        root.removeEventListener("keydown", handleKeyDown);
      };
    }, [editor, isOpen]);

    if (!isOpen) {
      return null;
    }

    const slotProps: ToolbarSlotProps = { editor };

    return createPortal(
      <TooltipProvider>
        <div
          role="toolbar"
          aria-label="Floating toolbar"
          aria-orientation="horizontal"
          className={classNames(
            "lb-root lb-portal lb-elevation lb-lexical-floating-toolbar lb-lexical-toolbar",
            className
          )}
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
          {applyToolbarSlot(leading, slotProps)}
          {applyToolbarSlot(children, slotProps)}
          {applyToolbarSlot(trailing, slotProps)}
        </div>
      </TooltipProvider>,
      document.body
    );
  }
);
