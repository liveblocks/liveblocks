"use client";

import type {
  DetectOverflowOptions,
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
import type { CommentBody } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import { Slot } from "@radix-ui/react-slot";
import type {
  AriaAttributes,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
} from "react";
import React, {
  forwardRef,
  useCallback,
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
  Transforms as SlateTransforms,
} from "slate";
import { withHistory } from "slate-history";
import type {
  RenderElementProps,
  RenderElementSpecificProps,
  RenderLeafProps,
} from "slate-react";
import {
  Editable,
  ReactEditor,
  Slate,
  useSelected,
  useSlateStatic,
  withReact,
} from "slate-react";

import { FLOATING_ELEMENT_COLLISION_PADDING } from "../../constants";
import { withAutoFormatting } from "../../slate/plugins/auto-formatting";
import { withEmptyClearFormatting } from "../../slate/plugins/empty-clear-formatting";
import type { MentionDraft } from "../../slate/plugins/mentions";
import {
  getMentionDraftAtSelection,
  insertMention,
  insertMentionCharacter,
  MENTION_CHARACTER,
  withMentions,
} from "../../slate/plugins/mentions";
import { withNormalize } from "../../slate/plugins/normalize";
import { getDOMRange } from "../../slate/utils/get-dom-range";
import { isEmpty } from "../../slate/utils/is-empty";
import { leaveMarkEdge, toggleMark } from "../../slate/utils/marks";
import type {
  ComposerBody as ComposerBodyData,
  ComposerBodyMention,
} from "../../types";
import { isKey } from "../../utils/is-key";
import { Portal } from "../../utils/Portal";
import { requestSubmit } from "../../utils/request-submit";
import { useId } from "../../utils/use-id";
import { useInitial } from "../../utils/use-initial";
import { useLayoutEffect } from "../../utils/use-layout-effect";
import { useRefs } from "../../utils/use-refs";
import { useRovingIndex } from "../../utils/use-roving-index";
import {
  ComposerContext,
  ComposerEditorContext,
  ComposerSuggestionsContext,
  useComposer,
  useComposerEditorContext,
  useComposerSuggestionsContext,
} from "./contexts";
import type {
  ComposerEditorElementProps,
  ComposerEditorProps,
  ComposerFormProps,
  ComposerMentionProps,
  ComposerMentionSuggestionsWrapperProps,
  ComposerMentionWrapperProps,
  ComposerRenderMentionProps,
  ComposerRenderMentionSuggestionsProps,
  ComposerSubmitProps,
  ComposerSuggestionsListItemProps,
  ComposerSuggestionsListProps,
  ComposerSuggestionsProps,
  SuggestionsPosition,
} from "./types";
import {
  commentBodyToComposerBody,
  composerBodyToCommentBody,
  getPlacementFromPosition,
  getSideAndAlignFromPlacement,
} from "./utils";

const MENTION_SUGGESTIONS_POSITION: SuggestionsPosition = "top";

const COMPOSER_MENTION_NAME = "ComposerMention";
const COMPOSER_SUGGESTIONS_NAME = "ComposerSuggestions";
const COMPOSER_SUGGESTIONS_LIST_NAME = "ComposerSuggestionsList";
const COMPOSER_SUGGESTIONS_LIST_ITEM_NAME = "ComposerSuggestionsListItem";
const COMPOSER_SUBMIT_NAME = "ComposerSubmit";
const COMPOSER_EDITOR_NAME = "ComposerEditor";
const COMPOSER_FORM_NAME = "ComposerForm";

const emptyCommentBody: CommentBody = {
  version: 1,
  content: [{ type: "paragraph", children: [{ text: "" }] }],
};

function createComposerEditor() {
  return withNormalize(
    withMentions(
      withEmptyClearFormatting(
        withAutoFormatting(withHistory(withReact(createEditor())))
      )
    )
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
      {element.id ? (
        <RenderMention userId={element.id} isSelected={isSelected} />
      ) : null}
      {children}
    </span>
  );
}

function ComposerDefaultRenderMentionSuggestions({
  userIds,
}: ComposerRenderMentionSuggestionsProps) {
  return userIds.length > 0 ? (
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
  dir,
  children: RenderMentionSuggestions = ComposerDefaultRenderMentionSuggestions,
}: ComposerMentionSuggestionsWrapperProps) {
  const editor = useSlateStatic();
  const { isFocused } = useComposer();
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [contentZIndex, setContentZIndex] = useState<string>();
  const contentRef = useCallback(setContent, [setContent]);
  const floatingMiddlewares: UseFloatingOptions["middleware"] = useMemo(() => {
    const detectOverflowOptions: DetectOverflowOptions = {
      padding: FLOATING_ELEMENT_COLLISION_PADDING,
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
            "--lb-composer-suggestions-available-width",
            `${availableWidth}px`
          );
          elements.floating.style.setProperty(
            "--lb-composer-suggestions-available-height",
            `${availableHeight}px`
          );
        },
      }),
    ];
  }, []);
  const floatingOptions: UseFloatingOptions = useMemo(() => {
    return {
      strategy: "fixed",
      open: Boolean(mentionDraft?.range && isFocused),
      placement: getPlacementFromPosition(position, dir),
      middleware: floatingMiddlewares,
      whileElementsMounted: autoUpdate,
    };
  }, [floatingMiddlewares, isFocused, position, dir, mentionDraft?.range]);
  const {
    refs: { setReference, setFloating },
    strategy,
    isPositioned,
    placement,
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

  return isFocused && userIds ? (
    <ComposerSuggestionsContext.Provider
      value={{
        id,
        itemId,
        selectedValue: selectedUserId,
        setSelectedValue: setSelectedUserId,
        onItemSelect,
        placement,
        dir,
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
    default:
      return null;
  }
}

// <code><s><em><strong>text</strong></s></em></code>
function ComposerEditorLeaf({ attributes, children, leaf }: RenderLeafProps) {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.strikethrough) {
    children = <s>{children}</s>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  return <span {...attributes}>{children}</span>;
}

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
const ComposerSuggestions = forwardRef<
  HTMLDivElement,
  ComposerSuggestionsProps
>(({ children, style, asChild, ...props }, forwardedRef) => {
  const { ref, placement, dir } = useComposerSuggestionsContext(
    COMPOSER_SUGGESTIONS_NAME
  );
  const [side, align] = useMemo(
    () => getSideAndAlignFromPlacement(placement),
    [placement]
  );
  const mergedRefs = useRefs(forwardedRef, ref);
  const Component = asChild ? Slot : "div";

  return (
    <Component
      dir={dir}
      {...props}
      data-side={side}
      data-align={align}
      style={{
        display: "flex",
        flexDirection: "column",
        maxHeight: "var(--lb-composer-suggestions-available-height)",
        ...style,
      }}
      ref={mergedRefs}
    >
      {children}
    </Component>
  );
});

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
    // TODO: Support props.id if provided, it will need to be sent up to Composer.Editor to use it in aria-activedescendant
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

/**
 * Displays the composer's editor.
 *
 * @example
 * <Composer.Editor placeholder="Write a comment…" />
 */
const ComposerEditor = forwardRef<HTMLDivElement, ComposerEditorProps>(
  (
    {
      initialValue,
      onKeyDown,
      onFocus,
      onBlur,
      disabled,
      autoFocus,
      renderMention,
      renderMentionSuggestions,
      dir,
      ...props
    },
    forwardedRef
  ) => {
    const { useMentionSuggestions, useSelf } = useRoomContextBundle();
    const self = useSelf();
    const isDisabled = useMemo(
      () => disabled || !self?.canComment,
      [disabled, self?.canComment]
    );
    const { editor, validate, setFocused } = useComposerEditorContext();
    const { submit, focus, isValid, isFocused } = useComposer();
    const initialBody = useInitial(initialValue ?? emptyCommentBody);
    const initialEditorValue = useMemo(() => {
      return commentBodyToComposerBody(initialBody);
    }, [initialBody]);

    const [mentionDraft, setMentionDraft] = useState<MentionDraft>();
    const mentionSuggestions = useMentionSuggestions(mentionDraft?.text);
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
        insertMention(editor, userId);
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

        // Allow leaving marks with ArrowLeft
        if (isKey(event, "ArrowLeft")) {
          leaveMarkEdge(editor, "start");
        }

        // Allow leaving marks with ArrowRight
        if (isKey(event, "ArrowRight")) {
          leaveMarkEdge(editor, "end");
        }

        if (mentionDraft && mentionSuggestions?.length) {
          // Select the next mention suggestion on ArrowDown
          if (isKey(event, "ArrowDown")) {
            event.preventDefault();
            setNextSelectedMentionSuggestionIndex();
          }

          // Select the previous mention suggestion on ArrowUp
          if (isKey(event, "ArrowUp")) {
            event.preventDefault();
            setPreviousSelectedMentionSuggestionIndex();
          }

          // Create a mention on Enter/Tab
          if (isKey(event, "Enter") || isKey(event, "Tab")) {
            event.preventDefault();

            const userId = mentionSuggestions?.[selectedMentionSuggestionIndex];
            createMention(userId);
          }

          // Close the suggestions on Escape
          if (isKey(event, "Escape")) {
            event.preventDefault();
            setMentionDraft(undefined);
            setSelectedMentionSuggestionIndex(0);
          }
        } else {
          // Blur the editor on Escape
          if (isKey(event, "Escape")) {
            event.preventDefault();
            ReactEditor.blur(editor);
          }

          // Submit the editor on Enter
          if (isKey(event, "Enter", { shift: false }) && isValid) {
            event.preventDefault();
            submit();
          }

          // Create a new line on Shift + Enter
          if (isKey(event, "Enter", { shift: true })) {
            event.preventDefault();
            editor.insertBreak();
          }

          // Toggle bold on Command/Control + B
          if (isKey(event, "b", { mod: true })) {
            event.preventDefault();
            toggleMark(editor, "bold");
          }

          // Toggle italic on Command/Control + I
          if (isKey(event, "i", { mod: true })) {
            event.preventDefault();
            toggleMark(editor, "italic");
          }

          // Toggle strikethrough on Command/Control + Shift + S
          if (isKey(event, "s", { mod: true, shift: true })) {
            event.preventDefault();
            toggleMark(editor, "strikethrough");
          }

          // Toggle code on Command/Control + E
          if (isKey(event, "e", { mod: true })) {
            event.preventDefault();
            toggleMark(editor, "code");
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
        return ReactEditor.toDOMNode(editor, editor) as HTMLDivElement;
      },
      [editor]
    );

    useEffect(() => {
      if (autoFocus) {
        focus();
      }
    }, [autoFocus, editor, focus]);

    return (
      <Slate
        editor={editor}
        initialValue={initialEditorValue}
        onChange={handleChange}
      >
        <Editable
          dir={dir}
          enterKeyHint={mentionDraft ? "enter" : "send"}
          autoCapitalize="sentences"
          aria-label="Comment body"
          data-focused={isFocused || undefined}
          data-disabled={isDisabled || undefined}
          {...propsWhileSuggesting}
          {...props}
          readOnly={isDisabled}
          disabled={isDisabled}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          renderElement={renderElement}
          renderLeaf={ComposerEditorLeaf}
        />
        {mentionDraft && (
          <ComposerMentionSuggestionsWrapper
            dir={dir}
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

/**
 * Surrounds the composer's content and handles submissions.
 *
 * @example
 * <Composer.Form onComposerSubmit={({ body }) => {}}>
 *	 <Composer.Editor />
 *   <Composer.Submit />
 * </Composer.Form>
 */
const ComposerForm = forwardRef<HTMLFormElement, ComposerFormProps>(
  (
    { children, onSubmit, onComposerSubmit, asChild, ...props },
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
        setValid(!isEmpty(editor, value));
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

    const focus = useCallback(() => {
      if (!ReactEditor.isFocused(editor)) {
        SlateTransforms.select(editor, SlateEditor.end(editor, []));
        ReactEditor.focus(editor);
      }
    }, [editor]);

    const blur = useCallback(() => {
      ReactEditor.blur(editor);
    }, [editor]);

    const createMention = useCallback(() => {
      focus();
      insertMentionCharacter(editor);
    }, [editor, focus]);

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        onSubmit?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        const body = composerBodyToCommentBody(
          editor.children as ComposerBodyData
        );
        const comment = { body };

        const promise = onComposerSubmit?.(comment, event);

        if (promise) {
          promise.then(clear);
        } else {
          clear();
        }

        event.preventDefault();
      },
      [clear, editor, onComposerSubmit, onSubmit]
    );

    return (
      <ComposerEditorContext.Provider
        value={{
          editor,
          validate,
          setFocused,
        }}
      >
        <ComposerContext.Provider
          value={{
            isFocused,
            isValid,
            submit,
            clear,
            focus,
            blur,
            createMention,
          }}
        >
          <Component {...props} onSubmit={handleSubmit} ref={mergedRefs}>
            {children}
          </Component>
        </ComposerContext.Provider>
      </ComposerEditorContext.Provider>
    );
  }
);

/**
 * A button to submit the composer.
 *
 * @example
 * <Composer.Submit>Send</Composer.Submit>
 */
const ComposerSubmit = forwardRef<HTMLButtonElement, ComposerSubmitProps>(
  ({ children, disabled, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "button";
    const { useSelf } = useRoomContextBundle();
    const { isValid } = useComposer();
    const self = useSelf();
    const isDisabled = useMemo(
      () => disabled || !isValid || !self?.canComment,
      [disabled, isValid, self?.canComment]
    );

    return (
      <Component
        type="submit"
        {...props}
        ref={forwardedRef}
        disabled={isDisabled}
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

// NOTE: Every export from this file will be available publicly as Composer.*
export {
  ComposerEditor as Editor,
  ComposerForm as Form,
  ComposerMention as Mention,
  ComposerSubmit as Submit,
  ComposerSuggestions as Suggestions,
  ComposerSuggestionsList as SuggestionsList,
  ComposerSuggestionsListItem as SuggestionsListItem,
};
