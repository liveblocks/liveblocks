import {
  autoUpdate,
  type DetectOverflowOptions,
  hide,
  type Middleware,
  offset,
  useFloating,
  type UseFloatingOptions,
} from "@floating-ui/react-dom";
import {
  EmojiIcon,
  TooltipProvider,
  useRefs,
} from "@liveblocks/react-ui/_private";
import { type Editor, useEditorState } from "@tiptap/react";
import type { ComponentProps } from "react";
import React, { forwardRef, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { classNames } from "../classnames";
import { EditorProvider } from "../context";
import type { AiToolbarExtensionStorage, FloatingPosition } from "../types";
import { compareTextSelections, getDomRangeFromTextSelection } from "../utils";

export interface AiToolbarProps
  extends Omit<ComponentProps<"div">, "children"> {
  editor: Editor | null;
  position?: FloatingPosition;
  offset?: number;
}

export const AI_TOOLBAR_COLLISION_PADDING = 10;

//   const handleInputChange = useCallback(
//     (event: ChangeEvent<HTMLInputElement>) => {
//       setInputValue(event.target.value);
//     },
//     []
//   );

//   const handleInputKeyDown = useCallback(
//     (event: ReactKeyboardEvent<HTMLInputElement>) => {
//       if (!editor) {
//         return;
//       }

//       if (
//         event.key === "Escape" ||
//         (inputValue === "" && event.key === "Backspace")
//       ) {
//         (editor.chain() as ExtendedChainedCommands<"closeAi">)
//           .closeAi()
//           .focus()
//           .run();
//       }
//     },
//     [editor, inputValue]
//   );

//   const handleInputBlur = useCallback(() => {
//     (editor.chain() as ExtendedChainedCommands<"closeAi">).closeAi().run();
//   }, [editor]);

/**
 * A custom Floating UI middleware to position/scale the toolbar:
 * - Vertically: relative to the reference (e.g. selection)
 * - Horizontally: relative to the editor
 * - Width: relative to the editor
 */
function tiptapFloating(editor: Editor | null): Middleware {
  return {
    name: "tiptap",
    options: editor,
    fn({ elements }) {
      if (!editor) {
        return {};
      }

      const editorRect = editor.view.dom.getBoundingClientRect();

      elements.floating.style.setProperty(
        "--lb-tiptap-editor-width",
        `${editorRect.width}px`
      );
      elements.floating.style.setProperty(
        "--lb-tiptap-editor-height",
        `${editorRect.height}px`
      );

      return {
        x: editorRect.x,
      };
    },
  };
}

export const AiToolbar = forwardRef<HTMLDivElement, AiToolbarProps>(
  (
    {
      position = "bottom",
      offset: sideOffset = 6,
      editor,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const aiToolbarSelection =
      useEditorState({
        editor,
        selector: (ctx) => {
          return (
            ctx.editor?.storage.liveblocksAiToolbar as
              | AiToolbarExtensionStorage
              | undefined
          )?.aiToolbarSelection;
        },
        equalityFn: compareTextSelections,
      }) ?? undefined;
    const floatingOptions: UseFloatingOptions = useMemo(() => {
      const detectOverflowOptions: DetectOverflowOptions = {
        padding: AI_TOOLBAR_COLLISION_PADDING,
      };

      return {
        strategy: "fixed",
        placement: position,
        middleware: [
          tiptapFloating(editor),
          hide(detectOverflowOptions),
          offset(sideOffset),
        ],
        whileElementsMounted: (...args) => {
          return autoUpdate(...args, {
            animationFrame: true,
          });
        },
      };
    }, [editor, position, sideOffset]);
    const isOpen = aiToolbarSelection !== undefined;
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
    const inputRef = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
      if (!editor || !isOpen) {
        return;
      }

      if (!aiToolbarSelection) {
        setReference(null);
      } else {
        const domRange = getDomRangeFromTextSelection(
          aiToolbarSelection,
          editor
        );

        setReference(domRange);
      }
    }, [aiToolbarSelection, editor, isOpen, setReference]);

    useLayoutEffect(() => {
      if (!editor || !isOpen || !inputRef.current) {
        return;
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }, [editor, isOpen]);

    if (!editor || !isOpen) {
      return null;
    }

    return createPortal(
      <TooltipProvider>
        <EditorProvider editor={editor}>
          <div
            role="toolbar"
            aria-label="Ask AI toolbar"
            aria-orientation="horizontal"
            className={classNames(
              "lb-root lb-portal lb-elevation lb-tiptap-ai-toolbar",
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
            {...props}
          >
            <div className="lb-tiptap-ai-toolbar-input-container">
              <input
                ref={inputRef}
                type="text"
                className="lb-tiptap-ai-toolbar-input"
                placeholder="Ask AI anything…"
                autoFocus
              />
              <EmojiIcon />
            </div>
          </div>
        </EditorProvider>
      </TooltipProvider>,
      document.body
    );
  }
);
