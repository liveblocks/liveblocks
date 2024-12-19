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
  KeyboardEvent as ReactKeyboardEvent,
  PropsWithChildren,
  ReactNode,
  RefObject,
} from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { classNames } from "../classnames";
import { EditorProvider, useCurrentEditor } from "../context";
import type {
  AiCommands,
  AiToolbarExtensionStorage,
  ExtendedChainedCommands,
  FloatingPosition,
} from "../types";
import { compareTextSelections, getDomRangeFromTextSelection } from "../utils";

export const AI_TOOLBAR_COLLISION_PADDING = 10;
export const DEFAULT_AI_NAME = "AI";

export interface AiToolbarProps
  extends Omit<ComponentProps<"div">, "value" | "defaultValue"> {
  editor: Editor | null;
  position?: FloatingPosition;
  offset?: number;
}

interface AiToolbarDropdownGroupProps extends ComponentProps<"div"> {
  label: string;
}

interface AiToolbarDropdownCustomItemProps
  extends ComponentProps<typeof Command.Item> {
  icon?: ReactNode;
}

interface AiToolbarDropdownItemProps extends ComponentProps<"div"> {
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

interface TextStreamOptions {
  interval?: number;
  characters?: number;
  onComplete?: () => void;
}

function useTextStream(text: string, options: TextStreamOptions = {}) {
  const interval = options.interval ?? 100;
  const characters = options.characters ?? 20;
  const onComplete = options.onComplete;
  const [stream, setStream] = useState("");
  const latestOnComplete = useRef(onComplete);

  useEffect(() => {
    latestOnComplete.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setStream("");

    if (!text) {
      return;
    }

    const intervalId = setInterval(
      () => {
        setStream((current) => {
          const nextLength = Math.min(current.length + characters, text.length);

          if (nextLength === text.length) {
            clearInterval(intervalId);

            latestOnComplete.current?.();
          }

          return text.slice(0, nextLength);
        });
      },
      interval + (Math.random() * 2 - 1) * interval * 0.2
    );

    return () => clearInterval(intervalId);
  }, [text, interval, characters]);

  return stream;
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

const AiToolbarDropdownCustomItem = forwardRef<
  HTMLDivElement,
  AiToolbarDropdownCustomItemProps
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

const AiToolbarDropdownItem = forwardRef<
  HTMLDivElement,
  AiToolbarDropdownItemProps
>(({ prompt: manualPrompt, ...props }, forwardedRef) => {
  const editor = useCurrentEditor("DropdownItem", "AiToolbar");

  const handleSelect = useCallback(
    (prompt: string) => {
      editor.commands.askAi(manualPrompt ?? prompt);
    },
    [editor, manualPrompt]
  );

  return (
    <AiToolbarDropdownCustomItem
      {...props}
      onSelect={handleSelect}
      ref={forwardedRef}
    />
  );
});

function AiToolbarReviewingDropdownItems({ editor }: { editor: Editor }) {
  const handleRetry = useCallback(() => {
    (editor.commands as AiCommands<boolean>).retryAskAi();
  }, [editor]);

  const handleDiscard = useCallback(() => {
    (editor.commands as AiCommands<boolean>).closeAi();
  }, [editor]);

  return (
    <>
      <AiToolbarDropdownCustomItem icon={<CheckIcon />}>
        Replace selection
      </AiToolbarDropdownCustomItem>
      <AiToolbarDropdownCustomItem icon={<CheckIcon />}>
        Insert below
      </AiToolbarDropdownCustomItem>
      <AiToolbarDropdownCustomItem icon={<UndoIcon />} onSelect={handleRetry}>
        Try again
      </AiToolbarDropdownCustomItem>
      <AiToolbarDropdownCustomItem
        icon={<CrossIcon />}
        onSelect={handleDiscard}
      >
        Discard
      </AiToolbarDropdownCustomItem>
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
    (editor.storage.liveblocksAiToolbar as AiToolbarExtensionStorage).name ??
    DEFAULT_AI_NAME;
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
    (editor.storage.liveblocksAiToolbar as AiToolbarExtensionStorage).name ??
    DEFAULT_AI_NAME;
  const stream = useTextStream(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis laoreet erat vitae libero bibendum blandit. Ut nec leo et massa congue laoreet et nec nunc. Praesent a hendrerit orci, sit amet feugiat sapien. Aenean vitae aliquam libero. Suspendisse posuere scelerisque mauris tristique placerat. Maecenas id ipsum justo. Nulla quis nibh est. Nulla facilisi. Quisque vitae libero ut tellus vestibulum sagittis in eget libero. Nulla enim mauris, tempor at egestas eu, porttitor vitae purus. Ut ultrices tincidunt rutrum.",
    {
      onComplete: () => {
        (editor.commands as AiCommands<boolean>).reviewAi();
      },
    }
  );

  const handleCancel = useCallback(() => {
    (editor.commands as AiCommands<boolean>).cancelAskAi();
  }, [editor]);

  // TODO: On error, go back to asking state (with error message, cancelAskAi(error))

  return (
    <>
      <div className="lb-tiptap-ai-toolbar-output">{stream}</div>
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
      <div className="lb-tiptap-ai-toolbar-output">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis laoreet
        erat vitae libero bibendum blandit. Ut nec leo et massa congue laoreet
        et nec nunc. Praesent a hendrerit orci, sit amet feugiat sapien. Aenean
        vitae aliquam libero. Suspendisse posuere scelerisque mauris tristique
        placerat. Maecenas id ipsum justo. Nulla quis nibh est. Nulla facilisi.
        Quisque vitae libero ut tellus vestibulum sagittis in eget libero. Nulla
        enim mauris, tempor at egestas eu, porttitor vitae purus. Ut ultrices
        tincidunt rutrum.
      </div>
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
  state: AiToolbarExtensionStorage["state"];
}>) {
  const prompt =
    useEditorState({
      editor,
      selector: (ctx) => {
        return (
          ctx.editor?.storage.liveblocksAiToolbar as
            | AiToolbarExtensionStorage
            | undefined
        )?.prompt;
      },
      equalityFn: Object.is,
    }) ?? "";
  const isPromptMultiline = useMemo(() => prompt.includes("\n"), [prompt]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasDropdownItems = useCommandState(
    (state) => state.filtered.count > 0
  ) as boolean;
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
        />
      </div>
      {state === "asking" || state === "reviewing" ? (
        <Command.List
          className="lb-elevation lb-dropdown lb-tiptap-ai-toolbar-dropdown"
          data-hidden={isDropdownHidden ? "" : undefined}
          ref={dropdownRef}
        >
          {state === "reviewing" ? (
            <AiToolbarReviewingDropdownItems editor={editor} />
          ) : (
            children
          )}
        </Command.List>
      ) : null}
    </>
  );
}

const defaultDropdownItems = (
  <>
    <AiToolbarDropdownGroup label="Generate">
      <AiToolbarDropdownItem icon={<EditIcon />}>
        Improve writing
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<CheckIcon />}>
        Fix mistakes
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<ShortenIcon />}>
        Simplify the text
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<LengthenIcon />}>
        Add more detail
      </AiToolbarDropdownItem>
    </AiToolbarDropdownGroup>
    <AiToolbarDropdownGroup label="Modify selection">
      <AiToolbarDropdownItem icon={<TranslateIcon />}>
        Translate to English
      </AiToolbarDropdownItem>
      <AiToolbarDropdownItem icon={<QuestionMarkIcon />}>
        Explain
      </AiToolbarDropdownItem>
    </AiToolbarDropdownGroup>
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
        children = defaultDropdownItems,
        ...props
      },
      forwardedRef
    ) => {
      const state =
        useEditorState({
          editor,
          selector: (ctx) => {
            return (
              ctx.editor?.storage.liveblocksAiToolbar as
                | AiToolbarExtensionStorage
                | undefined
            )?.state;
          },
          equalityFn: Object.is,
        }) ?? "closed";
      const selection =
        useEditorState({
          editor,
          selector: (ctx) => {
            return (
              ctx.editor?.storage.liveblocksAiToolbar as
                | AiToolbarExtensionStorage
                | undefined
            )?.selection;
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
            const domRange = getDomRangeFromTextSelection(selection, editor);

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
                {children}
              </AiToolbarContainer>
            </Command>
          </EditorProvider>
        </TooltipProvider>,
        document.body
      );
    }
  ),
  {
    DropdownGroup: AiToolbarDropdownGroup,
    DropdownItem: AiToolbarDropdownItem,
  }
);
