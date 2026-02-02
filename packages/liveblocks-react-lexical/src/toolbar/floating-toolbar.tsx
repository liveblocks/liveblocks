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
import {
  cn,
  Portal,
  TooltipProvider,
  useInitial,
  useRefs,
} from "@liveblocks/react-ui/_private";
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

import { OPEN_FLOATING_COMPOSER_COMMAND } from "../comments/floating-composer";
import { createDOMRange } from "../create-dom-range";
import { useIsCommandRegistered } from "../is-command-registered";
import type { FloatingPosition } from "../types";
import { useRootElement } from "../use-root-element";
import { FloatingToolbarContext, FloatingToolbarExternal } from "./shared";
import {
  applyToolbarSlot,
  Toolbar,
  type ToolbarSlot,
  type ToolbarSlotProps,
} from "./toolbar";

export interface FloatingToolbarProps
  extends Omit<ComponentProps<"div">, "children"> {
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

/**
 * A floating toolbar attached to the selection and containing actions and values related to the editor.
 *
 * @example
 * <FloatingToolbar />
 *
 * @example
 * <FloatingToolbar>
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
      const [editor] = useLexicalComposerContext();
      const root = useRootElement();
      const [isFocused, setFocused] = useState(false);
      const [isManuallyClosed, setManuallyClosed] = useState(false);
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

          if (event.relatedTarget === root) {
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

        root.addEventListener("focus", handleFocus);
        root.addEventListener("blur", handleBlur);

        return () => {
          root.removeEventListener("focus", handleFocus);
          root.removeEventListener("blur", handleBlur);
        };
      }, [root, externalIds]);

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

            if (event.relatedTarget === root) {
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
        [onBlur, root, externalIds]
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
        const handlePointerDown = () => {
          setPointerDown(true);
        };
        const handlePointerUp = () => {
          setPointerDown(false);
        };

        if (!root) {
          return;
        }

        root.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("pointercancel", handlePointerUp);
        document.addEventListener("pointerup", handlePointerUp);

        return () => {
          root.removeEventListener("pointerdown", handlePointerDown);
          document.removeEventListener("pointercancel", handlePointerUp);
          document.removeEventListener("pointerup", handlePointerUp);
        };
      }, [root]);

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

      const registerExternal = useCallback(
        (id: string) => {
          externalIds.add(id);

          return () => {
            externalIds.delete(id);
          };
        },
        [externalIds]
      );

      if (!delayedIsOpen) {
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
            <TooltipProvider>
              <FloatingToolbarContext.Provider
                value={{ close, registerExternal }}
              >
                {applyToolbarSlot(before, slotProps)}
                {applyToolbarSlot(children, slotProps)}
                {applyToolbarSlot(after, slotProps)}
              </FloatingToolbarContext.Provider>
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
     * <FloatingToolbar>
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
