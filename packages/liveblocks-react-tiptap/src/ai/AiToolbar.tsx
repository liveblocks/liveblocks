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
  TranslateIcon,
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
  ExtendedChainedCommands,
  FloatingPosition,
} from "../types";
import { getDomRangeFromSelection } from "../utils";

export const AI_TOOLBAR_COLLISION_PADDING = 10;
export const DEFAULT_AI_NAME = "AI";

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
      editor.commands.askAi(manualPrompt ?? prompt);
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

function AiToolbarReviewingSuggestions({ editor }: { editor: Editor }) {
  const handleRetry = useCallback(() => {
    (editor.commands as AiCommands<boolean>).retryAskAi();
  }, [editor]);

  const handleDiscard = useCallback(() => {
    (editor.commands as AiCommands<boolean>).closeAi();
  }, [editor]);

  return (
    <>
      <AiToolbarDropdownItem icon={<CheckIcon />}>
        Replace selection
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<CheckIcon />}>
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

function AiToolbarPromptContent({
  editor,
  prompt,
  dropdownRef,
  isDropdownHidden,
}: {
  editor: Editor;
  prompt: string;
  dropdownRef: RefObject<HTMLDivElement>;
  isDropdownHidden: boolean;
}) {
  const aiName =
    (editor.storage.liveblocksAi as AiExtensionStorage).name ?? DEFAULT_AI_NAME;
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const isPromptEmpty = useMemo(() => prompt.trim() === "", [prompt]);

  useLayoutEffect(
    () => {
      setTimeout(() => {
        const promptTextArea = promptRef.current;

        if (!promptTextArea) {
          return;
        }

        promptTextArea.focus();
        promptTextArea.setSelectionRange(
          promptTextArea.value.length,
          promptTextArea.value.length
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
        (editor.commands as AiCommands<boolean>).setAiPrompt(
          (prompt) => prompt + "\n"
        );
      } else {
        const selectedDropdownItem = dropdownRef.current?.querySelector(
          "[role='option'][data-selected='true']"
        ) as HTMLElement | null;

        if (!isDropdownHidden && selectedDropdownItem) {
          // If there's a selected dropdown item, select it
          selectedDropdownItem.click();
        } else if (!isPromptEmpty) {
          // Otherwise, submit the custom prompt
          (editor.commands as AiCommands<boolean>).askAi(prompt);
        }
      }
    }
  };

  const handlePromptChange = useCallback(
    (prompt: string) => {
      (editor.commands as AiCommands<boolean>).setAiPrompt(prompt);
    },
    [editor]
  );

  const handleSendClick = useCallback(() => {
    if (isPromptEmpty) {
      return;
    }

    (editor.commands as AiCommands<boolean>).askAi(prompt);
  }, [editor, prompt, isPromptEmpty]);

  return (
    <div className="lb-tiptap-ai-toolbar-content">
      <span className="lb-icon-container lb-tiptap-ai-toolbar-icon-container">
        <SparklesIcon />
      </span>
      <div
        className="lb-tiptap-ai-toolbar-prompt-container"
        data-value={prompt}
      >
        <Command.Input
          value={prompt}
          onValueChange={handlePromptChange}
          asChild
        >
          <textarea
            ref={promptRef}
            className="lb-tiptap-ai-toolbar-prompt"
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
            disabled={isPromptEmpty}
            onClick={handleSendClick}
          />
        </ShortcutTooltip>
      </div>
    </div>
  );
}

function AiToolbarAsking({
  editor,
  prompt,
  dropdownRef,
  isDropdownHidden,
}: {
  editor: Editor;
  prompt: string;
  dropdownRef: RefObject<HTMLDivElement>;
  isDropdownHidden: boolean;
}) {
  return (
    <>
      <AiToolbarPromptContent
        editor={editor}
        prompt={prompt}
        dropdownRef={dropdownRef}
        isDropdownHidden={isDropdownHidden}
      />
    </>
  );
}

function AiToolbarThinking({
  editor,
  prompt,
}: {
  editor: Editor;
  prompt: string;
}) {
  const aiName =
    (editor.storage.liveblocksAi as AiExtensionStorage).name ?? DEFAULT_AI_NAME;

  const handleCancel = useCallback(() => {
    (editor.commands as AiCommands<boolean>).cancelAskAi();
  }, [editor]);

  // TODO: On error, go back to asking state (with error message, cancelAskAi(error))

  return (
    <>
      <div className="lb-tiptap-ai-toolbar-content">
        <span className="lb-icon-container lb-tiptap-ai-toolbar-icon-container">
          <SparklesIcon />
        </span>
        <div className="lb-tiptap-ai-toolbar-thinking">
          {aiName} is thinking… ({prompt})
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
  prompt,
  dropdownRef,
  isDropdownHidden,
}: {
  editor: Editor;
  prompt: string;
  dropdownRef: RefObject<HTMLDivElement>;
  isDropdownHidden: boolean;
}) {
  return (
    <>
      <AiToolbarPromptContent
        editor={editor}
        prompt={prompt}
        dropdownRef={dropdownRef}
        isDropdownHidden={isDropdownHidden}
      />
    </>
  );
}

function AiToolbarContainer({
  editor,
  state,
  children,
}: PropsWithChildren<{
  editor: Editor;
  state: AiExtensionStorage["state"];
}>) {
  const prompt =
    useEditorState({
      editor,
      selector: (ctx) => {
        return (ctx.editor?.storage.liveblocksAi as AiExtensionStorage)?.prompt;
      },
      equalityFn: Object.is,
    }) ?? "";
  const isPromptMultiline = useMemo(() => prompt.includes("\n"), [prompt]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasCommandState = useCommandState(
    (state) => state.filtered.count > 0
  ) as boolean;
  const hasDropdownItems = state === "reviewing" || hasCommandState;
  const isDropdownHidden = isPromptMultiline || !hasDropdownItems;

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.defaultPrevented && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        if (state === "thinking") {
          (editor.commands as AiCommands<boolean>).cancelAskAi();
        } else {
          (editor.chain() as ExtendedChainedCommands<"closeAi">)
            .closeAi()
            .focus()
            .run();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, state]);

  return (
    <>
      <div className="lb-tiptap-ai-toolbar-container">
        <div className="lb-elevation lb-tiptap-ai-toolbar">
          {state === "asking" ? (
            <AiToolbarAsking
              editor={editor}
              prompt={prompt}
              dropdownRef={dropdownRef}
              isDropdownHidden={isDropdownHidden}
            />
          ) : state === "thinking" ? (
            <AiToolbarThinking editor={editor} prompt={prompt} />
          ) : state === "reviewing" ? (
            <AiToolbarReviewing
              editor={editor}
              prompt={prompt}
              dropdownRef={dropdownRef}
              isDropdownHidden={isDropdownHidden}
            />
          ) : null}
        </div>
        <div
          className="lb-tiptap-ai-toolbar-halo"
          data-active={state === "thinking" ? "" : undefined}
          aria-hidden
        >
          <div className="lb-tiptap-ai-toolbar-halo-horizontal" />
          <div className="lb-tiptap-ai-toolbar-halo-vertical" />
        </div>
      </div>
      {state === "asking" || state === "reviewing" ? (
        <Command.List
          className="lb-elevation lb-dropdown lb-tiptap-ai-toolbar-dropdown"
          data-hidden={isDropdownHidden ? "" : undefined}
          ref={dropdownRef}
        >
          {state === "reviewing" ? (
            <AiToolbarReviewingSuggestions editor={editor} />
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
    <AiToolbarSuggestionsGroup label="Generate">
      <AiToolbarSuggestion icon={<EditIcon />}>
        Improve writing
      </AiToolbarSuggestion>
      <AiToolbarSuggestion icon={<CheckIcon />}>
        Fix mistakes
      </AiToolbarSuggestion>
      <AiToolbarSuggestion icon={<ShortenIcon />}>
        Simplify the text
      </AiToolbarSuggestion>
      <AiToolbarSuggestion icon={<LengthenIcon />}>
        Add more detail
      </AiToolbarSuggestion>
    </AiToolbarSuggestionsGroup>
    <AiToolbarSuggestionsGroup label="Modify selection">
      <AiToolbarSuggestion icon={<TranslateIcon />}>
        Translate to English
      </AiToolbarSuggestion>
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
            return (ctx.editor?.storage.liveblocksAi as AiExtensionStorage)
              ?.state;
          },
          equalityFn: Object.is,
        }) ?? "closed";
      console.log("AI STATE!!!!", state);
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
      const isOpen = selection !== undefined;
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

      useEffect(() => {
        if (!editor) {
          return;
        }

        if (!selection && state !== "closed") {
          (editor.commands as AiCommands<boolean>).closeAi();
        }
      }, [state, editor, selection]);

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
              <AiToolbarContainer editor={editor} state={state}>
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
