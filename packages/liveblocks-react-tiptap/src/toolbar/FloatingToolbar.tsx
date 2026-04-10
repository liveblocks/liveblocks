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
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  cn,
  Portal,
  TooltipProvider,
  useInitial,
  useRefs,
} from "@liveblocks/react-ui/_private";
import { type Editor, isTextSelection, useEditorState } from "@tiptap/react";
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

import { EditorProvider } from "../context";
import type { FloatingPosition } from "../types";
import { FloatingToolbarContext, FloatingToolbarExternal } from "./shared";
import {
  applyToolbarSlot,
  Toolbar,
  type ToolbarSlot,
  type ToolbarSlotProps,
} from "./Toolbar";

export interface FloatingToolbarProps
  extends Omit<ComponentProps<"div">, "children"> {
  /**
   * The Tiptap editor.
   */
  editor: Editor | null;

  /**
   * The vertical position of the floating toolbar.
   */
  position?: FloatingPosition;

  /**
   * The vertical offset of the floating toolbar from the selection.
   */
  offset?: number;

  /**
   * The content of the floating toolbar, overriding the default content.
   * Use the `before` and `after` props if you want to keep and extend the default content.
   */
  children?: ToolbarSlot;

  /**
   * The content to display at the start of the floating toolbar.
   */
  before?: ToolbarSlot;

  /**
   * The content to display at the end of the floating toolbar.
   */
  after?: ToolbarSlot;
}

export const FLOATING_TOOLBAR_COLLISION_PADDING = 10;
const FLOATING_TOOLBAR_OPEN_DELAY = 50;

function DefaultFloatingToolbarContent({ editor }: ToolbarSlotProps) {
  const supportsThread = "addPendingComment" in editor.commands;
  const supportsAi = "askAi" in editor.commands;

  return (
    <>
      {supportsAi ? (
        <>
          <Toolbar.SectionAi />
          <Toolbar.Separator />
        </>
      ) : null}
      <Toolbar.BlockSelector />
      <Toolbar.SectionInline />
      {supportsThread ? (
        <>
          <Toolbar.Separator />
          <Toolbar.SectionCollaboration />
        </>
      ) : null}
    </>
  );
}

/**
 * A floating toolbar attached to the selection and containing actions and values related to the editor.
 *
 * @example
 * <FloatingToolbar editor={editor} />
 *
 * @example
 * <FloatingToolbar editor={editor}>
 *   <Toolbar.BlockSelector />
 *   <Toolbar.Separator />
 *   <Toolbar.SectionInline />
 *   <Toolbar.Separator />
 *   <Toolbar.Button name="Custom action" onClick={() => { ... }} icon={<Icon.QuestionMark />} />
 * </FloatingToolbar>
 */
export const FloatingToolbar = Object.assign(
  forwardRef<HTMLDivElement, FloatingToolbarProps>(
    (
      {
        children = DefaultFloatingToolbarContent,
        before,
        after,
        position = "top",
        offset: sideOffset = 6,
        editor,
        onPointerDown,
        onFocus,
        onBlur,
        className,
        ...props
      },
      forwardedRef
    ) => {
      const toolbarRef = useRef<HTMLDivElement>(null);
      const externalIds = useInitial<Set<string>>(() => new Set());
      const [isPointerDown, setPointerDown] = useState(false);
      const [isFocused, setFocused] = useState(false);
      const [isManuallyClosed, setManuallyClosed] = useState(false);
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

      const isOpen =
        isFocused && !isPointerDown && hasSelectionRange && !isManuallyClosed;
      const [delayedIsOpen, setDelayedIsOpen] = useState(isOpen);
      const delayedIsOpenTimeoutRef = useRef<number>();

      // Reset the manually closed state when there's another change
      useEffect(() => {
        if (!editor) {
          return;
        }

        setManuallyClosed(false);

        const handleSelectionChange = () => {
          setManuallyClosed(false);
        };

        editor.on("selectionUpdate", handleSelectionChange);

        return () => {
          editor.off("selectionUpdate", handleSelectionChange);
        };
      }, [isFocused, hasSelectionRange, editor]);

      // Don't close when the focus moves from the editor to the toolbar
      useEffect(() => {
        if (!editor) {
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

          if (event.relatedTarget === editor.view.dom) {
            return;
          }

          for (const externalId of externalIds) {
            if (
              document
                .getElementById(externalId)
                ?.contains(event.relatedTarget as Node)
            ) {
              return;
            }
          }

          setFocused(false);
        };

        editor.view.dom.addEventListener("focus", handleFocus);
        editor.view.dom.addEventListener("blur", handleBlur);

        return () => {
          editor.view.dom.removeEventListener("focus", handleFocus);
          editor.view.dom.removeEventListener("blur", handleBlur);
        };
      }, [editor, externalIds]);

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

            if (event.relatedTarget === editor?.view.dom) {
              return;
            }

            for (const externalId of externalIds) {
              if (
                document
                  .getElementById(externalId)
                  ?.contains(event.relatedTarget as Node)
              ) {
                return;
              }
            }

            setFocused(false);
          }
        },
        [onBlur, editor, externalIds]
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
        if (!editor) {
          return;
        }

        const handlePointerDown = () => {
          setPointerDown(true);
        };
        const handlePointerUp = () => {
          setPointerDown(false);
        };

        editor.view.dom.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("pointercancel", handlePointerUp);
        document.addEventListener("pointerup", handlePointerUp);

        return () => {
          editor.view.dom.removeEventListener("pointerdown", handlePointerDown);
          document.removeEventListener("pointercancel", handlePointerUp);
          document.removeEventListener("pointerup", handlePointerUp);
        };
      }, [editor]);

      useLayoutEffect(() => {
        if (!editor || !delayedIsOpen) {
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
      }, [editor, delayedIsOpen, setReference]);

      useEffect(() => {
        if (!editor || !delayedIsOpen) {
          return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.target !== editor.view.dom && event.defaultPrevented) {
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();

            editor.commands.focus();
            setManuallyClosed(true);
          }
        };

        editor.view.dom.addEventListener("keydown", handleKeyDown);

        return () => {
          editor.view.dom.removeEventListener("keydown", handleKeyDown);
        };
      }, [editor, delayedIsOpen]);

      const close = useCallback(() => {
        setManuallyClosed(true);
      }, [setManuallyClosed]);

      const registerExternal = useCallback(
        (id: string) => {
          externalIds.add(id);

          return () => {
            externalIds.delete(id);
          };
        },
        [externalIds]
      );

      if (!editor || !delayedIsOpen) {
        return null;
      }

      const slotProps: ToolbarSlotProps = { editor };

      return (
        <Portal asChild>
          <div
            role="toolbar"
            aria-label="Floating toolbar"
            aria-orientation="horizontal"
            className={cn(
              "lb-root lb-portal lb-elevation lb-tiptap-floating-toolbar lb-tiptap-toolbar",
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
            <TooltipProvider>
              <EditorProvider editor={editor}>
                <FloatingToolbarContext.Provider
                  value={{ close, registerExternal }}
                >
                  {applyToolbarSlot(before, slotProps)}
                  {applyToolbarSlot(children, slotProps)}
                  {applyToolbarSlot(after, slotProps)}
                </FloatingToolbarContext.Provider>
              </EditorProvider>
            </TooltipProvider>
          </div>
        </Portal>
      );
    }
  ),
  {
    /**
     * A component that can be wrapped around elements which are rendered outside of the floating
     * toolbar (e.g. portals) to prevent the toolbar from closing when clicking/focusing within them.
     *
     * @example
     * <FloatingToolbar editor={editor}>
     *   <Popover.Root>
     *     <Popover.Trigger asChild>
     *       <Toolbar.Button>Open popover</Toolbar.Button>
     *     </Popover.Trigger>
     *     <Popover.Portal>
     *       <FloatingToolbar.External>
     *         <Popover.Content>
     *           This popover is rendered outside of the floating toolbar, but the toolbar will not close when clicking/focusing within it.
     *         </Popover.Content>
     *       </FloatingToolbar.External>
     *     </Popover.Portal>
     *   </Popover.Root>
     * </FloatingToolbar>
     */
    External: FloatingToolbarExternal,
  }
);
