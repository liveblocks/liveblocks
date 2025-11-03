import {
  autoUpdate,
  type DetectOverflowOptions,
  hide,
  limitShift,
  type Middleware,
  offset,
  shift,
  useFloating,
  type UseFloatingOptions,
} from "@floating-ui/react-dom";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  ArrowCornerDownRightIcon,
  Button,
  CheckIcon,
  cn,
  CrossIcon,
  EditIcon,
  LengthenIcon,
  QuestionMarkIcon,
  SendIcon,
  ShortcutTooltip,
  ShortenIcon,
  SparklesIcon,
  SparklesTextIcon,
  StopIcon,
  TooltipProvider,
  UndoIcon,
  useRefs,
  WarningIcon,
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
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { EditorProvider, useCurrentEditor } from "../context";
import type {
  AiToolbarState,
  ChainedAiCommands,
} from "../types";
import { getDomRangeFromSelection } from "../utils";
import { DEFAULT_STATE, isContextualPromptDiffResponse } from "./AiExtension";

export const AI_TOOLBAR_COLLISION_PADDING = 10;

export interface AiToolbarProps
  extends Omit<ComponentProps<"div">, "value" | "defaultValue" | "children"> {
  /**
   * The Tiptap editor.
   */
  editor: Editor | null;

  /**
   * The vertical offset of the AI toolbar from the selection.
   */
  offset?: number;

  /**
   * The prompt suggestions to display below the AI toolbar.
   */
  suggestions?: ReactNode | ComponentType<PropsWithChildren>;
}

type AiToolbarDropdownSeparatorProps = ComponentProps<"div">;

interface AiToolbarDropdownItemProps
  extends ComponentProps<typeof Command.Item> {
  icon?: ReactNode;
}

type AiToolbarSuggestionsSeparatorProps = AiToolbarDropdownSeparatorProps;

type AiToolbarSuggestionsLabelProps = ComponentProps<"span">;

interface AiToolbarSuggestionProps extends ComponentProps<"div"> {
  prompt?: string;
  icon?: ReactNode;
}

interface AiToolbarContext {
  state: AiToolbarState;
  toolbarRef: RefObject<HTMLDivElement>;
  dropdownRef: RefObject<HTMLDivElement>;
  isDropdownHidden: boolean;
}

const AiToolbarContext = createContext<AiToolbarContext | null>(null);

function useAiToolbarContext() {
  const context = useContext(AiToolbarContext);

  if (!context) {
    throw new Error("useAiToolbarContext must be used within an AiToolbar");
  }

  return context;
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

/**
 * A custom Floating UI middleware to flip the toolbar/dropdown when shifted more than 100%.
 */
function flipToolbar(): Middleware {
  return {
    name: "flipToolbar",
    fn({ elements, middlewareData, rects }) {
      const shiftOffsetY = middlewareData.shift?.y ?? 0;

      if (Math.abs(shiftOffsetY) >= rects.floating.height) {
        elements.floating.setAttribute("data-liveblocks-ai-toolbar-flip", "");
      } else {
        elements.floating.removeAttribute("data-liveblocks-ai-toolbar-flip");
      }

      return {};
    },
  };
}

const AiToolbarDropdownSeparator = forwardRef<
  HTMLDivElement,
  AiToolbarDropdownSeparatorProps
>(({ className, ...props }, forwardedRef) => {
  return (
    <Command.Separator
      className={cn("lb-dropdown-separator", className)}
      {...props}
      ref={forwardedRef}
    />
  );
});

const AiToolbarSuggestionsSeparator = forwardRef<
  HTMLDivElement,
  AiToolbarSuggestionsSeparatorProps
>((props, forwardedRef) => {
  return <AiToolbarDropdownSeparator ref={forwardedRef} {...props} />;
});

const AiToolbarDropdownItem = forwardRef<
  HTMLDivElement,
  AiToolbarDropdownItemProps
>(({ children, onSelect, icon, className, ...props }, forwardedRef) => {
  return (
    <Command.Item
      className={cn("lb-dropdown-item", className)}
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

const AiToolbarSuggestionsLabel = forwardRef<
  HTMLDivElement,
  AiToolbarSuggestionsLabelProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <span
      ref={forwardedRef}
      className={cn("lb-dropdown-label", className)}
      {...props}
    >
      {children}
    </span>
  );
});

const AiToolbarSuggestion = forwardRef<
  HTMLDivElement,
  AiToolbarSuggestionProps
>(({ prompt: manualPrompt, ...props }, forwardedRef) => {
  const editor = useCurrentEditor("Suggestion", "AiToolbar");

  const handleSelect = useCallback(
    (prompt: string) => {
      (editor.commands).$startAiToolbarThinking(
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

function AiToolbarReviewingSuggestions() {
  const editor = useCurrentEditor("ReviewingSuggestions", "AiToolbar");
  const { state } = useAiToolbarContext();
  const { response } = state as Extract<AiToolbarState, { phase: "reviewing" }>;

  if (isContextualPromptDiffResponse(response)) {
    return (
      <>
        <AiToolbarDropdownItem
          icon={<CheckIcon />}
          onSelect={
            (editor.commands).$acceptAiToolbarResponse
          }
        >
          Accept
        </AiToolbarDropdownItem>
        <AiToolbarDropdownItem
          icon={<UndoIcon />}
          onSelect={
            (editor.commands).$startAiToolbarThinking
          }
        >
          Try again
        </AiToolbarDropdownItem>
        <AiToolbarDropdownItem
          icon={<CrossIcon />}
          onSelect={(editor.commands).$closeAiToolbar}
        >
          Discard
        </AiToolbarDropdownItem>
      </>
    );
  } else {
    return (
      <>
        <AiToolbarDropdownItem
          icon={<ArrowCornerDownRightIcon />}
          onSelect={
            (editor.commands).$acceptAiToolbarResponse
          }
        >
          Insert below
        </AiToolbarDropdownItem>
        <AiToolbarDropdownItem
          icon={<UndoIcon />}
          onSelect={
            (editor.commands).$startAiToolbarThinking
          }
        >
          Try again
        </AiToolbarDropdownItem>
        <AiToolbarDropdownItem
          icon={<CrossIcon />}
          onSelect={(editor.commands).$closeAiToolbar}
        >
          Discard
        </AiToolbarDropdownItem>
      </>
    );
  }
}

function AiToolbarCustomPromptContent() {
  const editor = useCurrentEditor("CustomPromptContent", "AiToolbar");
  // Eslint doesn't seem to like Tiptap's Type declaration strategy
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const aiName = editor.storage.liveblocksAi.name;
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { state, dropdownRef, isDropdownHidden } = useAiToolbarContext();
  const { customPrompt } = state as Exclude<
    AiToolbarState,
    { phase: "closed" }
  >;
  const isCustomPromptEmpty = useMemo(
    () => customPrompt.trim() === "",
    [customPrompt]
  );

  useLayoutEffect(
    () => {
      requestAnimationFrame(() => {
        const textArea = textAreaRef.current;

        if (!textArea) {
          return;
        }

        textArea.focus();
        textArea.setSelectionRange(
          textArea.value.length,
          textArea.value.length
        );
      });
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
        (editor.commands)._updateAiToolbarCustomPrompt(
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
          (editor.commands).$startAiToolbarThinking(
            customPrompt,
            state.phase === "reviewing"
          );
        }
      }
    }
  };

  const handleCustomPromptChange = useCallback(
    (customPrompt: string) => {
      (editor.commands)._updateAiToolbarCustomPrompt(
        customPrompt
      );
    },
    [editor]
  );

  const handleSendClick = useCallback(() => {
    if (isCustomPromptEmpty) {
      return;
    }

    (editor.commands).$startAiToolbarThinking(
      customPrompt,
      state.phase === "reviewing"
    );
  }, [editor, customPrompt, isCustomPromptEmpty, state.phase]);

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

function AiToolbarAsking() {
  const { state } = useAiToolbarContext();
  const { error } = state as Exclude<AiToolbarState, { phase: "closed" }>;

  return (
    <>
      <AiToolbarCustomPromptContent />
      {error ? (
        <div className="lb-tiptap-ai-toolbar-error">
          <span className="lb-icon-container">
            <WarningIcon />
          </span>
          There was a problem with your request.
        </div>
      ) : null}
    </>
  );
}

function AiToolbarThinking() {
  const editor = useCurrentEditor("AiToolbarThinking", "AiToolbar");
  const contentRef = useRef<HTMLDivElement>(null);
  const aiName = (editor.storage.liveblocksAi).name;

  const handleAbort = useCallback(() => {
    (editor.commands).$cancelAiToolbarThinking();
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
          <ShortcutTooltip content="Abort response" shortcut="Escape">
            <Button
              className="lb-tiptap-ai-toolbar-action"
              variant="secondary"
              aria-label="Abort response"
              icon={<StopIcon />}
              onClick={handleAbort}
            />
          </ShortcutTooltip>
        </div>
      </div>
    </>
  );
}

function AiToolbarReviewing() {
  const { state } = useAiToolbarContext();
  const { response } = state as Extract<AiToolbarState, { phase: "reviewing" }>;

  return (
    <>
      {response.type === "other" ? (
        <div className="lb-tiptap-ai-toolbar-response-container">
          <div className="lb-tiptap-ai-toolbar-response">{response.text}</div>
        </div>
      ) : null}
      <AiToolbarCustomPromptContent />
    </>
  );
}

function AiToolbarContainer({
  state,
  toolbarRef,
  dropdownRef,
  children,
}: PropsWithChildren<{
  state: AiToolbarState;
  toolbarRef: RefObject<HTMLDivElement>;
  dropdownRef: RefObject<HTMLDivElement>;
}>) {
  const editor = useCurrentEditor("AiToolbarContainer", "AiToolbar");
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

        if (state.phase === "thinking") {
          (editor.commands).$cancelAiToolbarThinking();
        } else {
          (editor.chain() as ChainedAiCommands).$closeAiToolbar().focus().run();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, state.phase]);

  return (
    <AiToolbarContext.Provider
      value={{
        state,
        toolbarRef,
        dropdownRef,
        isDropdownHidden,
      }}
    >
      <div className="lb-tiptap-ai-toolbar-container">
        <div className="lb-elevation lb-tiptap-ai-toolbar">
          {state.phase === "asking" ? (
            <AiToolbarAsking />
          ) : state.phase === "thinking" ? (
            <AiToolbarThinking />
          ) : state.phase === "reviewing" ? (
            <AiToolbarReviewing />
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
            <AiToolbarReviewingSuggestions />
          ) : (
            children
          )}
        </Command.List>
      ) : null}
    </AiToolbarContext.Provider>
  );
}

const defaultSuggestions = (
  <>
    <AiToolbarSuggestion
      icon={<EditIcon />}
      prompt="Improve the quality of the text"
    >
      Improve writing
    </AiToolbarSuggestion>
    <AiToolbarSuggestion
      icon={<CheckIcon />}
      prompt="Fix spelling & grammar errors in the text"
    >
      Fix mistakes
    </AiToolbarSuggestion>
    <AiToolbarSuggestion
      icon={<ShortenIcon />}
      prompt="Shorten the text, simplifying it"
    >
      Simplify
    </AiToolbarSuggestion>
    <AiToolbarSuggestion
      icon={<LengthenIcon />}
      prompt="Lengthen the text, going into more detail"
    >
      Add more detail
    </AiToolbarSuggestion>
    <AiToolbarSuggestionsSeparator />
    <AiToolbarSuggestion
      icon={<SparklesTextIcon />}
      prompt="Continue writing from the text's end"
    >
      Continue writing
    </AiToolbarSuggestion>
    <AiToolbarSuggestion
      icon={<QuestionMarkIcon />}
      prompt="Explain what the text is about"
    >
      Explain
    </AiToolbarSuggestion>
  </>
);

/**
 * @beta
 *
 * A floating AI toolbar attached to the editor.
 */
export const AiToolbar = Object.assign(
  forwardRef<HTMLDivElement, AiToolbarProps>(
    (
      {
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
              ctx.editor?.storage.liveblocksAi
            )?.state;
          },
        }) ?? DEFAULT_STATE;
      const selection = editor?.state.selection;
      const floatingOptions: UseFloatingOptions = useMemo(() => {
        const detectOverflowOptions: DetectOverflowOptions = {
          padding: AI_TOOLBAR_COLLISION_PADDING,
        };

        return {
          strategy: "fixed",
          placement: "bottom",
          middleware: [
            tiptapFloating(editor),
            hide(detectOverflowOptions),
            offset(sideOffset),
            shift({
              ...detectOverflowOptions,
              mainAxis: false,
              crossAxis: true,
              limiter: limitShift(),
            }),
            flipToolbar(),
          ],
          whileElementsMounted: (...args) => {
            return autoUpdate(...args, {
              animationFrame: true,
            });
          },
        };
      }, [editor, sideOffset]);
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
      const [selectedDropdownValue, setSelectedDropdownValue] = useState("");

      // Reset the selected dropdown value when the toolbar is closed
      useEffect(() => {
        if (state.phase === "closed") {
          setSelectedDropdownValue("");
        }
      }, [state.phase]);

      useEffect(() => {
        // Reset the selected dropdown value when the dropdown is closed
        if (state.phase === "closed") {
          setSelectedDropdownValue("");

          return;
        }

        // Otherwise, make sure a dropdown item is selected when moving between phases
        const selectedDropdownItem = dropdownRef.current?.querySelector(
          "[role='option'][data-selected='true']"
        );

        if (selectedDropdownItem) {
          return;
        }

        const firstDropdownItem =
          dropdownRef.current?.querySelector("[role='option']");

        setSelectedDropdownValue(
          (firstDropdownItem as HTMLElement | null)?.dataset.value ?? ""
        );
      }, [state.phase, dropdownRef, setSelectedDropdownValue]);

      useEffect(() => {
        if (!editor) {
          return;
        }

        if (!selection && state.phase !== "closed") {
          (editor.commands).$closeAiToolbar();
        }
      }, [state.phase, editor, selection]);

      useLayoutEffect(() => {
        if (!editor || !isOpen) {
          return;
        }

        setReference(null);

        setTimeout(() => {
          if (
            state.phase === "reviewing" &&
            isContextualPromptDiffResponse(state.response)
          ) {
            const changes = editor.view.dom.querySelectorAll(
              "ychange[data-liveblocks]"
            );

            // When diffs are displayed, we manually calculate bounds around all the
            // rendered changes instead of using the selection
            setReference({
              getBoundingClientRect: () => {
                const rects: DOMRect[] = [];

                changes.forEach((change) => {
                  rects.push(change.getBoundingClientRect());
                });

                const minX = Math.min(...rects.map((rect) => rect.left));
                const minY = Math.min(...rects.map((rect) => rect.top));
                const maxX = Math.max(...rects.map((rect) => rect.right));
                const maxY = Math.max(...rects.map((rect) => rect.bottom));

                return {
                  x: minX,
                  y: minY,
                  width: maxX - minX,
                  height: maxY - minY,
                  top: minY,
                  left: minX,
                  bottom: maxY,
                  right: maxX,
                };
              },
            });
          } else if (selection) {
            const domRange = getDomRangeFromSelection(editor, selection);
            setReference(domRange);
          } else {
            setReference(null);
          }
        }, 0);
      }, [
        selection,
        editor,
        isOpen,
        setReference,
        state.phase,
        state.response,
      ]);

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
            (editor.commands).$closeAiToolbar();
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
              className={cn(
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
              value={selectedDropdownValue}
              onValueChange={setSelectedDropdownValue}
              {...props}
            >
              <AiToolbarContainer
                state={state}
                dropdownRef={dropdownRef}
                toolbarRef={toolbarRef}
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
    /**
     * @beta
     *
     * A prompt suggestion displayed in the AI toolbar.
     */
    Suggestion: AiToolbarSuggestion,

    /**
     * @beta
     *
     * A label to describe a group of prompt suggestions displayed in the AI toolbar.
     */
    SuggestionsLabel: AiToolbarSuggestionsLabel,

    /**
     * @beta
     *
     * A separator between groups of prompt suggestions displayed in the AI toolbar.
     */
    SuggestionsSeparator: AiToolbarSuggestionsSeparator,
  }
);
