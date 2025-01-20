import {
  autoUpdate,
  type DetectOverflowOptions,
  hide,
  type Middleware,
  offset,
  useFloating,
  type UseFloatingOptions,
} from "@floating-ui/react-dom";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  Button,
  CheckIcon,
  CrossIcon,
  EditIcon,
  LengthenIcon,
  QuestionMarkIcon,
  SendIcon,
  ShortcutTooltip,
  ShortenIcon,
  SparklesIcon,
  TooltipProvider,
  UndoIcon,
  useRefs,
} from "@liveblocks/react-ui/_private";
import { type Editor, useEditorState } from "@tiptap/react";
import { Command, useCommandState } from "cmdk";
import type {
  ComponentProps,
  ComponentType,
  KeyboardEvent as ReactKeyboardEvent,
  PropsWithChildren,
  ReactNode,
  RefObject,
} from "react";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { classNames } from "../classnames";
import { EditorProvider, useCurrentEditor } from "../context";
import type {
  AiCommands,
  AiExtensionStorage,
  ChainedAiCommands,
  FloatingPosition,
} from "../types";
import { getDomRangeFromSelection } from "../utils";
import { DEFAULT_STATE } from "./AiExtension";

export const AI_TOOLBAR_COLLISION_PADDING = 10;

export interface AiToolbarProps
  extends Omit<ComponentProps<"div">, "value" | "defaultValue"> {
  editor: Editor | null;
  position?: FloatingPosition;
  offset?: number;
  suggestions?: ReactNode | ComponentType<PropsWithChildren>;
}

interface AiToolbarDropdownGroupProps extends ComponentProps<"div"> {
  label: string;
}

interface AiToolbarDropdownItemProps
  extends ComponentProps<typeof Command.Item> {
  icon?: ReactNode;
}

type AiToolbarSuggestionsGroupProps = AiToolbarDropdownGroupProps;

interface AiToolbarSuggestionProps extends ComponentProps<"div"> {
  prompt?: string;
  icon?: ReactNode;
}

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

const AiToolbarDropdownGroup = forwardRef<
  HTMLDivElement,
  AiToolbarDropdownGroupProps
>(({ children, label, ...props }, forwardedRef) => {
  return (
    <Command.Group
      heading={<span className="lb-dropdown-label">{label}</span>}
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Command.Group>
  );
});

const AiToolbarSuggestionsGroup = forwardRef<
  HTMLDivElement,
  AiToolbarSuggestionsGroupProps
>((props, forwardedRef) => {
  return <AiToolbarDropdownGroup ref={forwardedRef} {...props} />;
});

const AiToolbarDropdownItem = forwardRef<
  HTMLDivElement,
  AiToolbarDropdownItemProps
>(({ children, onSelect, icon, ...props }, forwardedRef) => {
  return (
    <Command.Item
      className="lb-dropdown-item"
      onSelect={onSelect}
      {...props}
      ref={forwardedRef}
    >
      {icon ? <span className="lb-icon-container">{icon}</span> : null}
      {children ? (
        <span className="lb-dropdown-item-label">{children}</span>
      ) : null}
    </Command.Item>
  );
});

const AiToolbarSuggestion = forwardRef<
  HTMLDivElement,
  AiToolbarSuggestionProps
>(({ prompt: manualPrompt, ...props }, forwardedRef) => {
  const editor = useCurrentEditor("Suggestion", "AiToolbar");

  const handleSelect = useCallback(
    (prompt: string) => {
      (editor.commands as unknown as AiCommands).$startAiToolbarThinking(
        manualPrompt ?? prompt
      );
    },
    [editor, manualPrompt]
  );

  return (
    <AiToolbarDropdownItem
      {...props}
      onSelect={handleSelect}
      ref={forwardedRef}
    />
  );
});

function AiToolbarReviewingSuggestions({
  editor,
  prompt,
}: {
  editor: Editor;
  prompt: string;
}) {
  const handleRetry = useCallback(() => {
    (editor.commands as unknown as AiCommands).$startAiToolbarThinking(prompt);
  }, [editor, prompt]);

  const handleDiscard = useCallback(() => {
    (editor.commands as unknown as AiCommands).$closeAiToolbar();
  }, [editor]);

  return (
    <>
      <AiToolbarDropdownItem icon={<CheckIcon />}>
        {/* TODO: Add logic */}
        Replace selection
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<CheckIcon />}>
        {/* TODO: Add logic */}
        Insert below
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<UndoIcon />} onSelect={handleRetry}>
        Try again
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<CrossIcon />} onSelect={handleDiscard}>
        Discard
      </AiToolbarDropdownItem>
    </>
  );
}

function AiToolbarCustomPromptContent({
  editor,
  customPrompt,
  dropdownRef,
  isDropdownHidden,
}: {
  editor: Editor;
  customPrompt: string;
  dropdownRef: RefObject<HTMLDivElement>;
  isDropdownHidden: boolean;
}) {
  const aiName = (editor.storage.liveblocksAi as AiExtensionStorage).name;
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const isCustomPromptEmpty = useMemo(
    () => customPrompt.trim() === "",
    [customPrompt]
  );

  useLayoutEffect(
    () => {
      setTimeout(() => {
        const textArea = textAreaRef.current;

        if (!textArea) {
          return;
        }

        textArea.focus();
        textArea.setSelectionRange(
          textArea.value.length,
          textArea.value.length
        );
      }, 0);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handlePromptKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        // If the shift key is pressed, add a new line
        (editor.commands as unknown as AiCommands)._updateAiToolbarCustomPrompt(
          (customPrompt) => customPrompt + "\n"
        );
      } else {
        const selectedDropdownItem = dropdownRef.current?.querySelector(
          "[role='option'][data-selected='true']"
        ) as HTMLElement | null;

        if (!isDropdownHidden && selectedDropdownItem) {
          // If there's a selected dropdown item, select it
          selectedDropdownItem.click();
        } else if (!isCustomPromptEmpty) {
          // Otherwise, submit the custom prompt
          (editor.commands as unknown as AiCommands).$startAiToolbarThinking(
            customPrompt
          );
        }
      }
    }
  };

  const handleCustomPromptChange = useCallback(
    (customPrompt: string) => {
      (editor.commands as unknown as AiCommands)._updateAiToolbarCustomPrompt(
        customPrompt
      );
    },
    [editor]
  );

  const handleSendClick = useCallback(() => {
    if (isCustomPromptEmpty) {
      return;
    }

    (editor.commands as unknown as AiCommands).$startAiToolbarThinking(
      customPrompt
    );
  }, [editor, customPrompt, isCustomPromptEmpty]);

  return (
    <div className="lb-tiptap-ai-toolbar-content">
      <span className="lb-icon-container lb-tiptap-ai-toolbar-icon-container">
        <SparklesIcon />
      </span>
      <div
        className="lb-tiptap-ai-toolbar-custom-prompt-container"
        data-value={customPrompt}
      >
        <Command.Input
          value={customPrompt}
          onValueChange={handleCustomPromptChange}
          asChild
        >
          <textarea
            ref={textAreaRef}
            className="lb-tiptap-ai-toolbar-custom-prompt"
            placeholder={`Ask ${aiName} anything…`}
            onKeyDown={handlePromptKeyDown}
            rows={1}
            autoFocus
          />
        </Command.Input>
      </div>
      <div className="lb-tiptap-ai-toolbar-actions">
        <ShortcutTooltip content={`Ask ${aiName}`} shortcut="Enter">
          <Button
            className="lb-tiptap-ai-toolbar-action"
            variant="primary"
            aria-label={`Ask ${aiName}`}
            icon={<SendIcon />}
            disabled={isCustomPromptEmpty}
            onClick={handleSendClick}
          />
        </ShortcutTooltip>
      </div>
    </div>
  );
}

function AiToolbarAsking({
  editor,
  customPrompt,
  dropdownRef,
  isDropdownHidden,
}: {
  editor: Editor;
  customPrompt: string;
  dropdownRef: RefObject<HTMLDivElement>;
  isDropdownHidden: boolean;
}) {
  return (
    <>
      <AiToolbarCustomPromptContent
        editor={editor}
        customPrompt={customPrompt}
        dropdownRef={dropdownRef}
        isDropdownHidden={isDropdownHidden}
      />
    </>
  );
}

function AiToolbarThinking({ editor }: { editor: Editor }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const aiName = (editor.storage.liveblocksAi as AiExtensionStorage).name;

  const handleCancel = useCallback(() => {
    (editor.commands as unknown as AiCommands).$cancelAiToolbarThinking();
  }, [editor]);

  // Focus the toolbar content and clear the current window selection while thinking
  useLayoutEffect(() => {
    contentRef.current?.focus();
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <>
      <div
        className="lb-tiptap-ai-toolbar-content"
        tabIndex={0}
        ref={contentRef}
      >
        <span className="lb-icon-container lb-tiptap-ai-toolbar-icon-container">
          <SparklesIcon />
        </span>
        <div className="lb-tiptap-ai-toolbar-thinking">
          {aiName} is thinking…
        </div>
        <div className="lb-tiptap-ai-toolbar-actions">
          <ShortcutTooltip content="Cancel" shortcut="Escape">
            <Button
              className="lb-tiptap-ai-toolbar-action"
              variant="secondary"
              aria-label="Cancel"
              icon={<UndoIcon />}
              onClick={handleCancel}
            />
          </ShortcutTooltip>
        </div>
      </div>
    </>
  );
}

function AiToolbarReviewing({
  editor,
  customPrompt,
  dropdownRef,
  isDropdownHidden,
}: {
  editor: Editor;
  customPrompt: string;
  dropdownRef: RefObject<HTMLDivElement>;
  isDropdownHidden: boolean;
}) {
  return (
    <>
      <AiToolbarCustomPromptContent
        editor={editor}
        customPrompt={customPrompt}
        dropdownRef={dropdownRef}
        isDropdownHidden={isDropdownHidden}
      />
    </>
  );
}

function AiToolbarContainer({
  editor,
  state,
  dropdownRef,
  children,
}: PropsWithChildren<{
  editor: Editor;
  state: AiExtensionStorage["state"];
  dropdownRef: RefObject<HTMLDivElement>;
}>) {
  const phase = state.phase;
  const customPrompt = state.customPrompt;
  const isCustomPromptMultiline = useMemo(
    () => customPrompt?.includes("\n"),
    [customPrompt]
  );
  const hasDropdownItems = useCommandState(
    (state) => state.filtered.count > 0
  ) as boolean;
  const isDropdownHidden = isCustomPromptMultiline || !hasDropdownItems;

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.defaultPrevented && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        if (phase === "thinking") {
          (editor.commands as unknown as AiCommands).$cancelAiToolbarThinking();
        } else {
          (editor.chain() as ChainedAiCommands).$closeAiToolbar().focus().run();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, phase]);

  return (
    <>
      <div className="lb-tiptap-ai-toolbar-container">
        <div className="lb-elevation lb-tiptap-ai-toolbar">
          {state.phase === "asking" ? (
            <AiToolbarAsking
              editor={editor}
              customPrompt={state.customPrompt}
              dropdownRef={dropdownRef}
              isDropdownHidden={isDropdownHidden}
            />
          ) : state.phase === "thinking" ? (
            <AiToolbarThinking editor={editor} />
          ) : state.phase === "reviewing" ? (
            <AiToolbarReviewing
              editor={editor}
              customPrompt={state.customPrompt}
              dropdownRef={dropdownRef}
              isDropdownHidden={isDropdownHidden}
            />
          ) : null}
        </div>
        <div
          className="lb-tiptap-ai-toolbar-halo"
          data-active={state.phase === "thinking" ? "" : undefined}
          aria-hidden
        >
          <div className="lb-tiptap-ai-toolbar-halo-horizontal" />
          <div className="lb-tiptap-ai-toolbar-halo-vertical" />
        </div>
      </div>
      {state.phase === "asking" || state.phase === "reviewing" ? (
        <Command.List
          className="lb-elevation lb-dropdown lb-tiptap-ai-toolbar-dropdown"
          data-hidden={isDropdownHidden ? "" : undefined}
          ref={dropdownRef}
        >
          {state.phase === "reviewing" ? (
            <AiToolbarReviewingSuggestions
              editor={editor}
              prompt={state.prompt}
            />
          ) : (
            children
          )}
        </Command.List>
      ) : null}
    </>
  );
}

const defaultSuggestions = (
  <>
    <AiToolbarSuggestionsGroup label="Modify">
      <AiToolbarSuggestion icon={<EditIcon />}>
        Improve writing
      </AiToolbarSuggestion>
      <AiToolbarSuggestion icon={<CheckIcon />}>
        Fix mistakes
      </AiToolbarSuggestion>
      <AiToolbarSuggestion icon={<ShortenIcon />}>Simplify</AiToolbarSuggestion>
      <AiToolbarSuggestion icon={<LengthenIcon />}>
        Add more detail
      </AiToolbarSuggestion>
    </AiToolbarSuggestionsGroup>
    <AiToolbarSuggestionsGroup label="Generate">
      <AiToolbarSuggestion icon={<QuestionMarkIcon />}>
        Explain
      </AiToolbarSuggestion>
    </AiToolbarSuggestionsGroup>
  </>
);

export const AiToolbar = Object.assign(
  forwardRef<HTMLDivElement, AiToolbarProps>(
    (
      {
        position = "bottom",
        offset: sideOffset = 6,
        editor,
        className,
        suggestions: Suggestions = defaultSuggestions,
        ...props
      },
      forwardedRef
    ) => {
      const state =
        useEditorState({
          editor,
          selector: (ctx) => {
            return (
              ctx.editor?.storage.liveblocksAi as AiExtensionStorage | undefined
            )?.state;
          },
        }) ?? DEFAULT_STATE;
      const phase = state.phase;
      const selection = editor?.state.selection;
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
      const isOpen = selection !== undefined && state.phase !== "closed";
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
      const toolbarRef = useRef<HTMLDivElement>(null);
      const mergedRefs = useRefs(forwardedRef, toolbarRef, setFloating);
      const dropdownRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (!editor) {
          return;
        }

        if (!selection && phase !== "closed") {
          (editor.commands as unknown as AiCommands).$closeAiToolbar();
        }
      }, [phase, editor, selection]);

      useLayoutEffect(() => {
        if (!editor || !isOpen) {
          return;
        }

        setReference(null);

        setTimeout(() => {
          if (!selection) {
            setReference(null);
          } else {
            const domRange = getDomRangeFromSelection(selection, editor);

            setReference(domRange);
          }
        }, 0);
      }, [selection, editor, isOpen, setReference]);

      // Close the toolbar when clicking anywhere outside of it
      useEffect(() => {
        if (!editor || !isOpen) {
          return;
        }

        const handleOutsideEvent = (event: MouseEvent) => {
          if (!toolbarRef.current) {
            return;
          }

          if (
            event.target &&
            !toolbarRef.current.contains(event.target as Node) &&
            (dropdownRef.current
              ? !dropdownRef.current.contains(event.target as Node)
              : true)
          ) {
            (editor.commands as unknown as AiCommands).$closeAiToolbar();
          }
        };

        setTimeout(() => {
          document.addEventListener("pointerdown", handleOutsideEvent);
        }, 0);

        return () => {
          document.removeEventListener("pointerdown", handleOutsideEvent);
        };
      }, [editor, isOpen]);

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
                "lb-root lb-portal lb-tiptap-ai-toolbar-portal",
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
              <AiToolbarContainer
                editor={editor}
                state={state}
                dropdownRef={dropdownRef}
              >
                {typeof Suggestions === "function" ? (
                  <Suggestions children={defaultSuggestions} />
                ) : (
                  Suggestions
                )}
              </AiToolbarContainer>
            </Command>
          </EditorProvider>
        </TooltipProvider>,
        document.body
      );
    }
  ),
  {
    SuggestionsGroup: AiToolbarSuggestionsGroup,
    Suggestion: AiToolbarSuggestion,
  }
);
