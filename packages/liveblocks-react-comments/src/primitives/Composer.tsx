"use client";

import type {
  DetectOverflowOptions,
  Placement,
  UseFloatingOptions,
} from "@floating-ui/react-dom";
import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import type { CommentBody, CommentBodyMention } from "@liveblocks/core";
import { createAsyncCache, isCommentBodyMention, nn } from "@liveblocks/core";
import { Slot } from "@radix-ui/react-slot";
import type {
  AriaAttributes,
  ComponentPropsWithoutRef,
  ComponentType,
  Dispatch,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  Ref,
  SetStateAction,
} from "react";
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Descendant as SlateDescendant,
  Element as SlateElement,
} from "slate";
import {
  createEditor,
  Editor as SlateEditor,
  Text as SlateText,
  Transforms as SlateTransforms,
} from "slate";
import { withHistory } from "slate-history";
import type {
  RenderElementProps,
  RenderElementSpecificProps,
  RenderLeafProps,
  RenderPlaceholderProps,
} from "slate-react";
import {
  Editable,
  ReactEditor,
  Slate,
  useSelected,
  useSlateStatic,
  withReact,
} from "slate-react";

import { useAsyncCache } from "../lib/use-async-cache";
import { useInitial } from "../lib/use-initial";
import type { MentionDraft } from "../slate/mentions";
import {
  getMentionDraftAtSelection,
  insertMention as insertComposerMention,
  isMention as isComposerBodyMention,
  MENTION_CHARACTER,
  withMentions,
} from "../slate/mentions";
import { withNormalize } from "../slate/normalize";
import { getDOMRange } from "../slate/utils/get-dom-range";
import type {
  ComponentPropsWithSlot,
  ComposerBody as ComposerBodyData,
  ComposerBodyMarks,
  ComposerBodyMention,
} from "../types";
import { isKey } from "../utils/is-key";
import { Portal } from "../utils/Portal";
import { requestSubmit } from "../utils/request-submit";
import { useDebounce } from "../utils/use-debounce";
import { useId } from "../utils/use-id";
import { useLayoutEffect } from "../utils/use-layout-effect";
import { useRefs } from "../utils/use-refs";
import { useRovingIndex } from "../utils/use-roving-index";

const MENTION_SUGGESTIONS_DEBOUNCE = 500;
const MENTION_SUGGESTIONS_POSITION: SuggestionsPosition = "top";
const MENTION_SUGGESTIONS_INSET = 10;

const COMPOSER_MENTION_NAME = "ComposerMention";
const COMPOSER_SUGGESTIONS_NAME = "ComposerSuggestions";
const COMPOSER_SUGGESTIONS_LIST_NAME = "ComposerSuggestionsList";
const COMPOSER_SUGGESTIONS_LIST_ITEM_NAME = "ComposerSuggestionsListItem";
const COMPOSER_SUBMIT_NAME = "ComposerSubmit";
const COMPOSER_EDITOR_NAME = "ComposerEditor";
const COMPOSER_FORM_NAME = "ComposerForm";

export interface ComposerRenderMentionProps {
  /**
   * Whether the mention is selected.
   */
  isSelected: boolean;

  /**
   * The mention's user ID.
   */
  userId: string;
}

export type ComposerMentionProps = ComponentPropsWithSlot<"span">;

export type ComposerRenderMentionSuggestionsProps = {
  /**
   * The list of suggested user IDs.
   */
  userIds?: string[];

  /**
   * The currently selected user ID.
   */
  selectedUserId?: string;
};

export type ComposerSuggestionsProps = ComponentPropsWithSlot<"div">;

export type ComposerSuggestionsListProps = ComponentPropsWithSlot<"ul">;

export interface ComposerSuggestionsListItemProps
  extends ComponentPropsWithSlot<"li"> {
  /**
   * The suggestion's value.
   */
  value: string;
}

export interface ComposerEditorProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The editor's initial value.
   */
  initialValue?: CommentBody;

  /**
   * The text to display when the editor is empty.
   */
  placeholder?: string;

  /**
   * Whether the editor is disabled.
   */
  disabled?: boolean;

  /**
   * The component used to render mentions.
   */
  renderMention?: ComponentType<ComposerRenderMentionProps>;

  /**
   * The component used to render mention suggestions.
   */
  renderMentionSuggestions?: ComponentType<ComposerRenderMentionSuggestionsProps>;

  /**
   * An asynchronous function to get a list of suggested user IDs from a string.
   */
  resolveMentionSuggestions?: (text: string) => Promise<string[]>;
}

export interface ComposerFormProps extends ComponentPropsWithSlot<"form"> {
  /**
   * The event handler called when the form is submitted.
   */
  onCommentSubmit?: (
    comment: ComposerSubmitComment,
    event: FormEvent<HTMLFormElement>
  ) => Promise<void> | void;
}

export type ComposerSubmitProps = ComponentPropsWithSlot<"button">;

export interface ComposerSubmitComment {
  /**
   * The submitted comment's body.
   */
  body: CommentBody;
}

export type ComposerContext = {
  /**
   * Whether the editor is currently valid.
   */
  isValid: boolean;

  /**
   * Submit the composer programmatically.
   */
  submit: () => void;

  /**
   * Clear the composer programmatically.
   */
  clear: () => void;

  /**
   * Insert text in the composer at the current selection.
   */
  insertText: (text: string) => void;
};

export interface ComposerMentionSuggestionsWrapperProps {
  id: string;
  itemId: (userId?: string) => string | undefined;
  mentionDraft: MentionDraft;
  userIds?: string[];
  selectedUserId?: string;
  setSelectedUserId: (userId: string) => void;
  children?: ComposerEditorProps["renderMentionSuggestions"];
  onItemSelect: (userId: string) => void;
  position?: SuggestionsPosition;
  inset?: number;
}

export interface ComposerEditorElementProps extends RenderElementProps {
  renderMention: ComposerEditorProps["renderMention"];
}

export interface ComposerMentionWrapperProps
  extends RenderElementSpecificProps<ComposerBodyMention> {
  renderMention: ComposerEditorProps["renderMention"];
}

type SuggestionsPosition = "top" | "bottom";

type ComposerEditorContext = {
  validate: (value: SlateElement[]) => void;
  editor: SlateEditor;
  isFocused: boolean;
  setFocused: Dispatch<SetStateAction<boolean>>;
};

type ComposerSuggestionsContext = {
  id: string;
  itemId: (value?: string) => string | undefined;
  selectedValue?: string;
  setSelectedValue: (value: string) => void;
  onItemSelect: (value: string) => void;
  ref: Ref<HTMLDivElement>;
};

const ComposerContext = createContext<ComposerContext | null>(null);
const ComposerEditorContext = createContext<ComposerEditorContext | null>(null);
const ComposerSuggestionsContext =
  createContext<ComposerSuggestionsContext | null>(null);

const mentionSuggestionsCache = createAsyncCache<string[], unknown>(() =>
  Promise.resolve([])
);

function composerBodyMentionToCommentBodyMention(
  mention: ComposerBodyMention
): CommentBodyMention {
  return {
    type: "mention",
    userId: mention.userId,
  };
}

function commentBodyMentionToComposerBodyMention(
  mention: CommentBodyMention
): ComposerBodyMention {
  return {
    type: "mention",
    userId: mention.userId,
    children: [{ text: "" }],
  };
}

export function composerBodyToCommentBody(body: ComposerBodyData): CommentBody {
  return {
    content: body.map((block) => ({
      ...block,
      children: block.children.map((inline) => {
        if (SlateText.isText(inline)) {
          return inline;
        }

        if (isComposerBodyMention(inline)) {
          return composerBodyMentionToCommentBodyMention(inline);
        }

        return inline;
      }),
    })),
  };
}

export function commentBodyToComposerBody(body: CommentBody): ComposerBodyData {
  return body.content.map((block) => ({
    ...block,
    children: block.children.map((inline) => {
      if (isCommentBodyMention(inline)) {
        return commentBodyMentionToComposerBodyMention(inline);
      }

      return inline;
    }),
  }));
}

export function isMarkActive(editor: SlateEditor, format: ComposerBodyMarks) {
  const marks = SlateEditor.marks(editor);

  return marks ? marks[format] === true : false;
}

export function toggleMark(editor: SlateEditor, format: ComposerBodyMarks) {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    SlateEditor.removeMark(editor, format);
  } else {
    SlateEditor.addMark(editor, format, true);
  }
}

const defaultResolveMentionSuggestions = () => Promise.resolve([]);

const emptyCommentBody: CommentBody = {
  content: [{ type: "paragraph", children: [{ text: "" }] }],
};

function createComposerEditor() {
  return withNormalize(withMentions(withHistory(withReact(createEditor()))));
}

function useComposerEditorContext(source = "useComposerEditorContext") {
  const composerEditorContext = useContext(ComposerEditorContext);

  return nn(
    composerEditorContext,
    `${source} can’t be used outside of ${COMPOSER_FORM_NAME}.`
  );
}

function useComposerSuggestionsContext(
  source = "useComposerSuggestionsContext"
) {
  const composerSuggestionsContext = useContext(ComposerSuggestionsContext);

  return nn(
    composerSuggestionsContext,
    `${source} can’t be used outside of renderMentionSuggestions.`
  );
}

function useMentionSuggestions(
  value: string | undefined,
  resolveMentionSuggestions: (text: string) => Promise<string[]>,
  delay: number | false = MENTION_SUGGESTIONS_DEBOUNCE
) {
  const debouncedValue = useDebounce(value, delay);
  const { data } = useAsyncCache(
    mentionSuggestionsCache,
    debouncedValue ?? null,
    {
      overrideFunction: resolveMentionSuggestions,
      keepPreviousDataWhileLoading: true,
    }
  );

  return data;
}

export function useComposer(): ComposerContext {
  const composerContext = useContext(ComposerContext);

  return nn(
    composerContext,
    `useComposer can’t be used outside of ${COMPOSER_FORM_NAME}.`
  );
}

function ComposerDefaultRenderMention({ userId }: ComposerRenderMentionProps) {
  return (
    <ComposerMention>
      {MENTION_CHARACTER}
      {userId}
    </ComposerMention>
  );
}

function ComposerEditorRenderMentionWrapper({
  renderMention: RenderMention = ComposerDefaultRenderMention,
  attributes,
  children,
  element,
}: ComposerMentionWrapperProps) {
  const isSelected = useSelected();

  return (
    <span {...attributes}>
      <RenderMention userId={element.userId} isSelected={isSelected} />
      {children}
    </span>
  );
}

function ComposerDefaultRenderMentionSuggestions({
  userIds,
}: ComposerRenderMentionSuggestionsProps) {
  return userIds && userIds.length > 0 ? (
    <ComposerSuggestions>
      <ComposerSuggestionsList>
        {userIds.map((userId) => (
          <ComposerSuggestionsListItem value={userId}>
            {userId}
          </ComposerSuggestionsListItem>
        ))}
      </ComposerSuggestionsList>
    </ComposerSuggestions>
  ) : null;
}

function ComposerMentionSuggestionsWrapper({
  id,
  itemId,
  userIds,
  selectedUserId,
  setSelectedUserId,
  mentionDraft,
  onItemSelect,
  position = MENTION_SUGGESTIONS_POSITION,
  inset = MENTION_SUGGESTIONS_INSET,
  children: RenderMentionSuggestions = ComposerDefaultRenderMentionSuggestions,
}: ComposerMentionSuggestionsWrapperProps) {
  const editor = useSlateStatic();
  const { isFocused } = useComposerEditorContext();
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [contentZIndex, setContentZIndex] = useState<string>();
  const contentRef = useCallback(setContent, [setContent]);
  const placement = useMemo(() => `${position}-start` as Placement, [position]);
  const floatingMiddlewares: UseFloatingOptions["middleware"] = useMemo(() => {
    const detectOverflowOptions: DetectOverflowOptions = {
      padding: inset,
    };

    return [
      flip({ ...detectOverflowOptions, crossAxis: false }),
      hide(detectOverflowOptions),
      shift({
        ...detectOverflowOptions,
        limiter: limitShift(),
      }),
      size({
        ...detectOverflowOptions,
        apply({ availableWidth, availableHeight, elements }) {
          elements.floating.style.setProperty(
            "--liveblocks-composer-suggestions-available-width",
            `${availableWidth}px`
          );
          elements.floating.style.setProperty(
            "--liveblocks-composer-suggestions-available-height",
            `${availableHeight}px`
          );
        },
      }),
    ];
  }, [inset]);
  const floatingOptions: UseFloatingOptions = useMemo(() => {
    return {
      strategy: "fixed",
      open: Boolean(mentionDraft?.range && isFocused),
      placement,
      middleware: floatingMiddlewares,
      whileElementsMounted: autoUpdate,
    };
  }, [floatingMiddlewares, isFocused, placement, mentionDraft?.range]);
  const {
    refs: { setReference, setFloating },
    strategy,
    isPositioned,
    x,
    y,
  } = useFloating(floatingOptions);

  useEffect(() => {
    const domRange = getDOMRange(editor, mentionDraft?.range);

    if (domRange) {
      setReference({
        getBoundingClientRect: () => domRange.getBoundingClientRect(),
        getClientRects: () => domRange.getClientRects(),
      });
    }
  }, [setReference, editor, mentionDraft?.range]);

  useLayoutEffect(() => {
    if (content) {
      setContentZIndex(window.getComputedStyle(content).zIndex);
    }
  }, [content]);

  return isFocused ? (
    <ComposerSuggestionsContext.Provider
      value={{
        id,
        itemId,
        selectedValue: selectedUserId,
        setSelectedValue: setSelectedUserId,
        onItemSelect,
        ref: contentRef,
      }}
    >
      <Portal
        ref={setFloating}
        style={{
          position: strategy,
          top: 0,
          left: 0,
          transform: isPositioned
            ? `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
            : "translate3d(0, -200%, 0)",
          minWidth: "max-content",
          zIndex: contentZIndex,
        }}
      >
        <RenderMentionSuggestions
          userIds={userIds}
          selectedUserId={selectedUserId}
        />
      </Portal>
    </ComposerSuggestionsContext.Provider>
  ) : null;
}

function ComposerEditorElement({
  renderMention,
  ...props
}: ComposerEditorElementProps) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { attributes, children, element } = props;

  switch (element.type) {
    case "mention":
      return (
        <ComposerEditorRenderMentionWrapper
          renderMention={renderMention}
          {...(props as RenderElementSpecificProps<ComposerBodyMention>)}
        />
      );
    case "paragraph":
      return (
        <p {...attributes} style={{ position: "relative" }}>
          {children}
        </p>
      );
  }
}

function ComposerEditorLeaf({ attributes, children, leaf }: RenderLeafProps) {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  return <span {...attributes}>{children}</span>;
}

function ComposerEditorPlaceholder({
  children,
  attributes,
}: RenderPlaceholderProps) {
  return (
    <span
      {...attributes}
      style={{
        ...attributes.style,
        // Prevent the placeholder from inheriting block styling.
        // See https://github.com/ianstormtaylor/slate/issues/2908
        fontWeight: "initial",
        fontStyle: "initial",
      }}
    >
      {children}
    </span>
  );
}

const ComposerMention = forwardRef<HTMLSpanElement, ComposerMentionProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "span";
    const isSelected = useSelected();

    return (
      <Component
        data-selected={isSelected || undefined}
        {...props}
        ref={forwardedRef}
      >
        {children}
      </Component>
    );
  }
);

const ComposerSuggestions = forwardRef<
  HTMLDivElement,
  ComposerSuggestionsProps
>(({ children, style, asChild, ...props }, forwardedRef) => {
  const { ref } = useComposerSuggestionsContext(COMPOSER_SUGGESTIONS_NAME);
  const mergedRefs = useRefs(forwardedRef, ref);
  const Component = asChild ? Slot : "div";

  return (
    <Component
      {...props}
      style={{
        display: "flex",
        flexDirection: "column",
        maxHeight: "var(--liveblocks-composer-suggestions-available-height)",
        ...style,
      }}
      ref={mergedRefs}
    >
      {children}
    </Component>
  );
});

const ComposerSuggestionsList = forwardRef<
  HTMLUListElement,
  ComposerSuggestionsListProps
>(({ children, asChild, ...props }, forwardedRef) => {
  const { id } = useComposerSuggestionsContext(COMPOSER_SUGGESTIONS_LIST_NAME);
  const Component = asChild ? Slot : "ul";

  return (
    <Component
      role="listbox"
      id={id}
      aria-label="Suggestions list"
      {...props}
      ref={forwardedRef}
    >
      {children}
    </Component>
  );
});

const ComposerSuggestionsListItem = forwardRef<
  HTMLLIElement,
  ComposerSuggestionsListItemProps
>(
  (
    { value, children, onPointerMove, onPointerDown, asChild, ...props },
    forwardedRef
  ) => {
    const ref = useRef<HTMLLIElement>(null);
    const mergedRefs = useRefs(forwardedRef, ref);
    const { selectedValue, setSelectedValue, itemId, onItemSelect } =
      useComposerSuggestionsContext(COMPOSER_SUGGESTIONS_LIST_ITEM_NAME);
    const Component = asChild ? Slot : "li";
    const isSelected = useMemo(
      () => selectedValue === value,
      [selectedValue, value]
    );
    const id = useMemo(() => itemId(value), [itemId, value]);

    useEffect(() => {
      if (ref?.current && isSelected) {
        ref.current.scrollIntoView({ block: "nearest" });
      }
    }, [isSelected]);

    const handlePointerMove = useCallback(
      (event: PointerEvent<HTMLLIElement>) => {
        onPointerMove?.(event);

        if (!event.isDefaultPrevented()) {
          setSelectedValue(value);
        }
      },
      [onPointerMove, setSelectedValue, value]
    );

    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLLIElement>) => {
        onPointerDown?.(event);

        if (!event.isDefaultPrevented()) {
          const target = event.target as HTMLElement;

          if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
          }

          if (event.button === 0 && event.ctrlKey === false) {
            onItemSelect(value);

            event.preventDefault();
          }
        }
      },
      [onItemSelect, onPointerDown, value]
    );

    return (
      <Component
        role="option"
        id={id}
        data-selected={isSelected || undefined}
        aria-selected={isSelected || undefined}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        {...props}
        ref={mergedRefs}
      >
        {children}
      </Component>
    );
  }
);

const ComposerEditor = forwardRef<HTMLDivElement, ComposerEditorProps>(
  (
    {
      initialValue,
      onKeyDown,
      onFocus,
      onBlur,
      placeholder,
      disabled,
      renderMention,
      renderMentionSuggestions,
      resolveMentionSuggestions = defaultResolveMentionSuggestions,
      ...props
    },
    forwardedRef
  ) => {
    const { editor, validate, isFocused, setFocused } =
      useComposerEditorContext(COMPOSER_EDITOR_NAME);
    const { submit, isValid } = useComposer();
    const initialBody = useInitial(initialValue ?? emptyCommentBody);
    const initialEditorValue = useMemo(() => {
      return commentBodyToComposerBody(initialBody);
    }, [initialBody]);

    const [mentionDraft, setMentionDraft] = useState<MentionDraft>();
    const mentionSuggestions = useMentionSuggestions(
      mentionDraft?.text,
      resolveMentionSuggestions
    );
    const [
      selectedMentionSuggestionIndex,
      setPreviousSelectedMentionSuggestionIndex,
      setNextSelectedMentionSuggestionIndex,
      setSelectedMentionSuggestionIndex,
    ] = useRovingIndex(0, mentionSuggestions?.length ?? 0);
    const id = useId();
    const suggestionsListId = useMemo(
      () => `liveblocks-suggestions-list-${id}`,
      [id]
    );
    const suggestionsListItemId = useCallback(
      (userId?: string) =>
        userId ? `liveblocks-suggestions-list-item-${id}-${userId}` : undefined,
      [id]
    );
    const renderElement = useCallback(
      (props: RenderElementProps) => {
        return (
          <ComposerEditorElement renderMention={renderMention} {...props} />
        );
      },
      [renderMention]
    );

    const handleChange = useCallback(
      (value: SlateDescendant[]) => {
        validate(value as SlateElement[]);

        setMentionDraft(getMentionDraftAtSelection(editor));
      },
      [editor, validate]
    );

    const createMention = useCallback(
      (userId?: string) => {
        if (!mentionDraft || !userId) {
          return;
        }

        SlateTransforms.select(editor, mentionDraft.range);
        insertComposerMention(editor, userId);
        setMentionDraft(undefined);
        setSelectedMentionSuggestionIndex(0);
      },
      [editor, mentionDraft, setSelectedMentionSuggestionIndex]
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (mentionDraft) {
          if (isKey(event, "ArrowDown")) {
            event.preventDefault();
            setNextSelectedMentionSuggestionIndex();
          }

          if (isKey(event, "ArrowUp")) {
            event.preventDefault();
            setPreviousSelectedMentionSuggestionIndex();
          }

          if (isKey(event, "Enter") || isKey(event, "Tab")) {
            event.preventDefault();

            const userId = mentionSuggestions?.[selectedMentionSuggestionIndex];
            createMention(userId);
          }

          if (isKey(event, "Escape")) {
            event.preventDefault();
            setMentionDraft(undefined);
            setSelectedMentionSuggestionIndex(0);
          }
        } else {
          if (isKey(event, "Escape")) {
            event.preventDefault();
            ReactEditor.blur(editor);
          }

          if (isKey(event, "Enter", { shift: false }) && isValid) {
            event.preventDefault();
            submit();
          }

          if (isKey(event, "Enter", { shift: true })) {
            event.preventDefault();
            editor.insertBreak();
          }

          if (isKey(event, "b", { mod: true })) {
            event.preventDefault();
            toggleMark(editor, "bold");
          }

          if (isKey(event, "i", { mod: true })) {
            event.preventDefault();
            toggleMark(editor, "italic");
          }
        }
      },
      [
        createMention,
        editor,
        isValid,
        mentionDraft,
        mentionSuggestions,
        selectedMentionSuggestionIndex,
        onKeyDown,
        setNextSelectedMentionSuggestionIndex,
        setPreviousSelectedMentionSuggestionIndex,
        setSelectedMentionSuggestionIndex,
        submit,
      ]
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        onFocus?.(event);

        if (!event.isDefaultPrevented()) {
          setFocused(true);
        }
      },
      [onFocus, setFocused]
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        onBlur?.(event);

        if (!event.isDefaultPrevented()) {
          setFocused(false);
        }
      },
      [onBlur, setFocused]
    );

    const selectedMentionSuggestionUserId = useMemo(
      () => mentionSuggestions?.[selectedMentionSuggestionIndex],
      [selectedMentionSuggestionIndex, mentionSuggestions]
    );
    const setSelectedMentionSuggestionUserId = useCallback(
      (userId: string) => {
        const index = mentionSuggestions?.indexOf(userId);

        if (index !== undefined && index >= 0) {
          setSelectedMentionSuggestionIndex(index);
        }
      },
      [setSelectedMentionSuggestionIndex, mentionSuggestions]
    );

    const propsWhileSuggesting: AriaAttributes = useMemo(
      () =>
        mentionDraft
          ? {
              role: "combobox",
              "aria-autocomplete": "list",
              "aria-expanded": true,
              "aria-controls": suggestionsListId,
              "aria-activedescendant": suggestionsListItemId(
                selectedMentionSuggestionUserId
              ),
            }
          : {},
      [
        mentionDraft,
        suggestionsListId,
        suggestionsListItemId,
        selectedMentionSuggestionUserId,
      ]
    );

    useImperativeHandle(
      forwardedRef,
      () => {
        const node = ReactEditor.toDOMNode(editor, editor) as HTMLDivElement;

        return {
          ...node,
          // The default focus behavior has some issues (e.g. setting the cursor at the beginning).
          focus: () => {
            if (window.getSelection && document.createRange) {
              const range = document.createRange();
              node.focus();
              range.setStart(node, node.childNodes.length);
              range.setEnd(node, node.childNodes.length);

              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            } else {
              node.focus();
            }
          },
        };
      },
      [editor]
    );

    return (
      <Slate
        editor={editor}
        initialValue={initialEditorValue}
        onChange={handleChange}
      >
        <Editable
          enterKeyHint={mentionDraft ? "enter" : "send"}
          autoCapitalize="sentences"
          aria-label="Comment body"
          data-focused={isFocused || undefined}
          data-disabled={disabled || undefined}
          {...propsWhileSuggesting}
          {...props}
          readOnly={disabled}
          disabled={disabled}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          renderElement={renderElement}
          renderLeaf={ComposerEditorLeaf}
          renderPlaceholder={ComposerEditorPlaceholder}
        />
        {mentionDraft && (
          <ComposerMentionSuggestionsWrapper
            mentionDraft={mentionDraft}
            selectedUserId={selectedMentionSuggestionUserId}
            setSelectedUserId={setSelectedMentionSuggestionUserId}
            userIds={mentionSuggestions}
            id={suggestionsListId}
            itemId={suggestionsListItemId}
            onItemSelect={createMention}
          >
            {renderMentionSuggestions}
          </ComposerMentionSuggestionsWrapper>
        )}
      </Slate>
    );
  }
);

const ComposerForm = forwardRef<HTMLFormElement, ComposerFormProps>(
  (
    { children, onSubmit, onCommentSubmit, asChild, ...props },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "form";
    const editor = useInitial(createComposerEditor);
    const [isValid, setValid] = useState(false);
    const [isFocused, setFocused] = useState(false);
    const ref = useRef<HTMLFormElement>(null);
    const mergedRefs = useRefs(forwardedRef, ref);

    const validate = useCallback(
      (value: SlateElement[]) => {
        const isEmpty =
          value.length <= 1 && SlateEditor.isEmpty(editor, value[0]);

        setValid(!isEmpty);
      },
      [editor]
    );

    const submit = useCallback(() => {
      if (ref.current) {
        requestSubmit(ref.current);
      }
    }, []);

    const clear = useCallback(() => {
      SlateTransforms.delete(editor, {
        at: {
          anchor: SlateEditor.start(editor, []),
          focus: SlateEditor.end(editor, []),
        },
      });
    }, [editor]);

    const insertText = useCallback(
      (text: string) => {
        SlateTransforms.insertText(editor, text);
      },
      [editor]
    );

    const handleSubmit = useCallback(
      async (event: FormEvent<HTMLFormElement>) => {
        onSubmit?.(event);

        if (event.defaultPrevented) {
          return;
        }

        event.preventDefault();

        const body = composerBodyToCommentBody(
          editor.children as ComposerBodyData
        );
        const comment = { body };

        await onCommentSubmit?.(comment, event);

        clear();
      },
      [clear, editor, onCommentSubmit, onSubmit]
    );

    return (
      <ComposerEditorContext.Provider
        value={{
          editor,
          validate,
          isFocused,
          setFocused,
        }}
      >
        <ComposerContext.Provider
          value={{ isValid, submit, clear, insertText }}
        >
          <Component {...props} onSubmit={handleSubmit} ref={mergedRefs}>
            {children}
          </Component>
        </ComposerContext.Provider>
      </ComposerEditorContext.Provider>
    );
  }
);

const ComposerSubmit = forwardRef<HTMLButtonElement, ComposerSubmitProps>(
  ({ children, disabled, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "button";
    const { isValid } = useComposer();

    return (
      <Component
        type="submit"
        {...props}
        ref={forwardedRef}
        disabled={disabled ?? !isValid}
      >
        {children}
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  ComposerEditor.displayName = COMPOSER_EDITOR_NAME;
  ComposerForm.displayName = COMPOSER_FORM_NAME;
  ComposerMention.displayName = COMPOSER_MENTION_NAME;
  ComposerSubmit.displayName = COMPOSER_SUBMIT_NAME;
  ComposerSuggestions.displayName = COMPOSER_SUGGESTIONS_NAME;
  ComposerSuggestionsList.displayName = COMPOSER_SUGGESTIONS_LIST_NAME;
  ComposerSuggestionsListItem.displayName = COMPOSER_SUGGESTIONS_LIST_ITEM_NAME;
}

// TODO: Use `export *` to export all components in a tree-shakeable way
export const Composer = {
  /**
   * Displays the composer's editor.
   *
   * @example
   * <Composer.Editor placeholder="Write a comment…" />
   */
  Editor: ComposerEditor,

  /**
   * Surrounds the composer's content and handles submissions.
   *
   * @example
   * <Composer.Form onCommentSubmit={({ body }) => {}}>
   *	 <Composer.Editor />
   *   <Composer.Submit />
   * </Composer.Form>
   */
  Form: ComposerForm,

  /**
   * Displays mentions within `Composer.Editor`.
   *
   * @example
   * <Composer.Editor
   *   renderMention={({ userId, isSelected }) => (
   *     <Composer.Mention>
   *       @{userId}
   *     </Composer.Mention>
   *   )}
   * />
   */
  Mention: ComposerMention,

  /**
   * Submits the composer.
   *
   * @example
   * <Composer.Submit>Comment</Composer.Submit>
   */
  Submit: ComposerSubmit,

  /**
   * Surrounds a list of suggestions within `Composer.Editor`.
   *
   * @example
   * <Composer.Editor
   *   renderMention={({ userId, isSelected }) => (
   *     <Composer.SuggestionsList>
   *       {userIds.map((userId) => (
   *         <Composer.SuggestionsListItem
   *           key={userId}
   *           value={userId}
   *         >
   *           @{userId}
   *         </Composer.SuggestionsListItem>
   *       ))}
   *     </Composer.SuggestionsList>
   *   )}
   * />
   */
  Suggestions: ComposerSuggestions,

  /**
   * Displays a list of suggestions within `Composer.Editor`.
   *
   * @example
   * <Composer.Editor
   *   renderMention={({ userId, isSelected }) => (
   *     <Composer.SuggestionsList>
   *       {userIds.map((userId) => (
   *         <Composer.SuggestionsListItem
   *           key={userId}
   *           value={userId}
   *         >
   *           @{userId}
   *         </Composer.SuggestionsListItem>
   *       ))}
   *     </Composer.SuggestionsList>
   *   )}
   * />
   */
  SuggestionsList: ComposerSuggestionsList,

  /**
   * Displays a suggestion within `Composer.SuggestionsList`.
   *
   * @example
   * <Composer.SuggestionsList>
   *   {userIds.map((userId) => (
   *     <Composer.SuggestionsListItem
   *       key={userId}
   *       value={userId}
   *     >
   *       @{userId}
   *     </Composer.SuggestionsListItem>
   *   ))}
   * </Composer.SuggestionsList>
   */
  SuggestionsListItem: ComposerSuggestionsListItem,
};
