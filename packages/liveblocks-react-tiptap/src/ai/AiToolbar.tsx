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
  Button,
  CheckIcon,
  EditIcon,
  EmojiIcon,
  LengthenIcon,
  QuestionMarkIcon,
  SendIcon,
  ShortcutTooltip,
  ShortenIcon,
  TooltipProvider,
  TranslateIcon,
  useRefs,
} from "@liveblocks/react-ui/_private";
import { type Editor, useEditorState } from "@tiptap/react";
import { Command, useCommandState } from "cmdk";
import type {
  ChangeEvent,
  ComponentProps,
  KeyboardEvent,
  PropsWithChildren,
  ReactNode,
} from "react";
import React, {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { classNames } from "../classnames";
import { EditorProvider } from "../context";
import type {
  AiToolbarExtensionStorage,
  ExtendedChainedCommands,
  FloatingPosition,
} from "../types";
import { compareTextSelections, getDomRangeFromTextSelection } from "../utils";

export interface AiToolbarProps
  extends Omit<ComponentProps<"div">, "children" | "value" | "defaultValue"> {
  editor: Editor | null;
  position?: FloatingPosition;
  offset?: number;
}

export const AI_TOOLBAR_COLLISION_PADDING = 10;

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

interface DropdownItemProps extends PropsWithChildren {
  icon?: ReactNode;
}

function DropdownItem({ children, icon }: DropdownItemProps) {
  const handleSelect = useCallback(() => {
    console.log("Click");
  }, []);

  return (
    <Command.Item className="lb-dropdown-item" onSelect={handleSelect}>
      {icon ? <span className="lb-icon-container">{icon}</span> : null}
      {children ? (
        <span className="lb-dropdown-item-label">{children}</span>
      ) : null}
    </Command.Item>
  );
}

function AiToolbarContent({ editor }: { editor: Editor }) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const hasDropdownItems = useCommandState(
    (state) => state.filtered.count > 0
  ) as boolean;

  useLayoutEffect(() => {
    if (!promptRef.current) {
      return;
    }

    setTimeout(() => {
      promptRef.current?.focus();
    }, 0);
  }, []);

  const handlePromptKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          // If the shift key is pressed, add a new line
          setPrompt((prompt) => prompt + "\n");
        } else if ("TODO:") {
          // If there's a selected dropdown item, select it
        } else {
          // Submit the custom prompt
        }
      } else if (
        event.key === "Escape" ||
        (event.key === "Backspace" && prompt === "")
      ) {
        // Close the toolbar on escape or backspace only when the prompt is empty
        event.preventDefault();
        event.stopPropagation();

        (editor.chain() as ExtendedChainedCommands<"closeAi">)
          .closeAi()
          .focus()
          .run();
      }
    },
    [prompt, editor]
  );

  const handlePromptChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(event.target.value);
    },
    []
  );

  return (
    <>
      <div
        className="lb-elevation lb-tiptap-ai-toolbar-prompt-container"
        data-value={prompt}
      >
        <Command.Input asChild>
          <textarea
            ref={promptRef}
            className="lb-tiptap-ai-toolbar-prompt"
            placeholder="Ask AI anything…"
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handlePromptKeyDown}
            rows={1}
            autoFocus
          />
        </Command.Input>
        <div className="lb-tiptap-ai-toolbar-decorations">
          <span className="lb-tiptap-ai-toolbar-icon-container">
            <EmojiIcon />
          </span>
          <ShortcutTooltip content="Ask AI" shortcut="Enter">
            <Button
              className="lb-tiptap-ai-toolbar-action"
              variant="primary"
              aria-label="Ask AI"
              icon={<SendIcon />}
            />
          </ShortcutTooltip>
        </div>
      </div>
      <div
        className="lb-elevation lb-dropdown lb-tiptap-ai-toolbar-dropdown"
        data-hidden={!hasDropdownItems ? "" : undefined}
      >
        <Command.List>
          <Command.Group
            heading={<span className="lb-dropdown-label">Generate</span>}
          >
            <DropdownItem icon={<EditIcon />}>Improve writing</DropdownItem>
            <DropdownItem icon={<CheckIcon />}>Fix mistakes</DropdownItem>
            <DropdownItem icon={<ShortenIcon />}>Simplify</DropdownItem>
            <DropdownItem icon={<LengthenIcon />}>Add more detail</DropdownItem>
          </Command.Group>
          <Command.Group
            heading={
              <span className="lb-dropdown-label">Modify selection</span>
            }
          >
            <DropdownItem icon={<TranslateIcon />}>Translate</DropdownItem>
            <DropdownItem icon={<QuestionMarkIcon />}>Explain</DropdownItem>
          </Command.Group>
        </Command.List>
      </div>
    </>
  );
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

    if (!editor || !isOpen) {
      return null;
    }

    return createPortal(
      <TooltipProvider>
        <EditorProvider editor={editor}>
          <Command
            role="toolbar"
            label="AI toolbar"
            aria-orientation="horizontal"
            className={classNames(
              "lb-root lb-portal lb-tiptap-ai-toolbar",
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
            }}
            {...props}
          >
            <AiToolbarContent editor={editor} />
          </Command>
        </EditorProvider>
      </TooltipProvider>,
      document.body
    );
  }
);
