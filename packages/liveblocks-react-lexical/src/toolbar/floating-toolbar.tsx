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
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import type {
  ComponentProps,
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { classNames } from "../classnames";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "../comments/floating-composer";
import { createDOMRange } from "../create-dom-range";
import { useIsCommandRegistered } from "../is-command-registered";
import type { FloatingPosition } from "../types";
import { FloatingToolbarContext } from "./floating-toolbar-context";
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
  before?: ToolbarSlot;
  after?: ToolbarSlot;
}

export const FLOATING_TOOLBAR_COLLISION_PADDING = 10;
const FLOATING_TOOLBAR_OPEN_DELAY = 50;

function DefaultFloatingToolbarContent() {
  const supportsTextFormat = useIsCommandRegistered(FORMAT_TEXT_COMMAND);
  const supportsThread = useIsCommandRegistered(OPEN_FLOATING_COMPOSER_COMMAND);

  return (
    <>
      {supportsTextFormat ? (
        <>
          <Toolbar.BlockSelector />
          <Toolbar.SectionInline />
        </>
      ) : null}
      {supportsThread ? (
        <>
          <Toolbar.Separator />
          <Toolbar.SectionCollaboration />
        </>
      ) : null}
    </>
  );
}

export const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  (
    {
      children = DefaultFloatingToolbarContent,
      before,
      after,
      position = "top",
      offset: sideOffset = 6,
      onPointerDown,
      onFocus,
      onBlur,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [isPointerDown, setPointerDown] = useState(false);
    const [editor] = useLexicalComposerContext();
    const [isFocused, setFocused] = useState(false);
    const [isManuallyClosed, setManuallyClosed] = useState(false);
    const isEditable = editor.isEditable();
    const [hasSelectionRange, setHasSelectionRange] = useState(false);

    const isOpen =
      isFocused && !isPointerDown && hasSelectionRange && !isManuallyClosed;
    const [delayedIsOpen, setDelayedIsOpen] = useState(isOpen);
    const delayedIsOpenTimeoutRef = useRef<number>();

    // Reset the manually closed state when there's another change
    useEffect(() => {
      setManuallyClosed(false);
    }, [isFocused, hasSelectionRange, editor]);

    // Don't close when the focus moves from the editor to the toolbar
    useEffect(() => {
      const root = editor.getRootElement();

      if (!root) {
        return;
      }

      const handleFocus = () => {
        setFocused(true);
      };

      const handleBlur = (event: FocusEvent) => {
        if (
          event.relatedTarget &&
          toolbarRef.current?.contains(event.relatedTarget as Node)
        ) {
          return;
        }

        if (event.relatedTarget === editor.getRootElement()) {
          return;
        }

        setFocused(false);
      };

      root.addEventListener("focus", handleFocus);
      root.addEventListener("blur", handleBlur);

      return () => {
        root.removeEventListener("focus", handleFocus);
        root.removeEventListener("blur", handleBlur);
      };
    }, [editor]);

    const handleFocus = useCallback(
      (event: ReactFocusEvent<HTMLDivElement>) => {
        onFocus?.(event);

        if (!event.isDefaultPrevented()) {
          setFocused(true);
        }
      },
      [onFocus]
    );

    // Close the toolbar when the it loses focus to something else than the editor
    const handleBlur = useCallback(
      (event: ReactFocusEvent<HTMLDivElement>) => {
        onBlur?.(event);

        if (!event.isDefaultPrevented()) {
          if (
            event.relatedTarget &&
            toolbarRef.current?.contains(event.relatedTarget as Node)
          ) {
            return;
          }

          if (event.relatedTarget === editor?.getRootElement()) {
            return;
          }

          setFocused(false);
        }
      },
      [onBlur, editor]
    );

    // Delay the opening of the toolbar to avoid flickering issues
    useEffect(() => {
      if (isOpen) {
        delayedIsOpenTimeoutRef.current = window.setTimeout(() => {
          setDelayedIsOpen(true);
        }, FLOATING_TOOLBAR_OPEN_DELAY);
      } else {
        setDelayedIsOpen(false);
      }

      return () => {
        window.clearTimeout(delayedIsOpenTimeoutRef.current);
      };
    }, [isOpen]);

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
      open: delayedIsOpen,
    });
    const mergedRefs = useRefs(forwardedRef, toolbarRef, setFloating);

    const handlePointerDown = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerDown?.(event);

        event.stopPropagation();

        // Prevent the toolbar from closing when clicking on the toolbar itself
        if (event.target === toolbarRef.current) {
          event.preventDefault();
        }
      },
      [onPointerDown]
    );

    useEffect(() => {
      if (!editor || !isEditable) {
        return;
      }

      const handlePointerDown = () => {
        setPointerDown(true);
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

          setManuallyClosed(false);

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
      const root = editor.getRootElement();

      if (!root || !delayedIsOpen) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.target !== root && event.defaultPrevented) {
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();

          editor.focus();
          setManuallyClosed(true);
        }
      };

      root.addEventListener("keydown", handleKeyDown);

      return () => {
        root.removeEventListener("keydown", handleKeyDown);
      };
    }, [editor, delayedIsOpen]);

    const close = useCallback(() => {
      editor.focus();
      setManuallyClosed(true);
    }, [editor, setManuallyClosed]);

    if (!delayedIsOpen) {
      return null;
    }

    const slotProps: ToolbarSlotProps = { editor };

    return createPortal(
      <TooltipProvider>
        <FloatingToolbarContext.Provider value={{ close }}>
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
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          >
            {applyToolbarSlot(before, slotProps)}
            {applyToolbarSlot(children, slotProps)}
            {applyToolbarSlot(after, slotProps)}
          </div>
        </FloatingToolbarContext.Provider>
      </TooltipProvider>,
      document.body
    );
  }
);
