"use client";

import {
  type CommentAttachment,
  type CommentBody,
  type CommentLocalAttachment,
  createCommentAttachmentId,
  type EventSource,
  makeEventSource,
} from "@liveblocks/core";
import {
  useClientOrNull,
  useLayoutEffect,
  useMentionSuggestions,
  useResolveMentionSuggestions,
  useRoomOrNull,
  useSyncSource,
} from "@liveblocks/react/_private";
import { Slot, Slottable } from "@radix-ui/react-slot";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type {
  AriaAttributes,
  ChangeEvent,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  SyntheticEvent,
} from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
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
  insertText as insertSlateText,
  Range as SlateRange,
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

import { useLiveblocksUIConfig } from "../../config";
import { withAutoFormatting } from "../../slate/plugins/auto-formatting";
import { withAutoLinks } from "../../slate/plugins/auto-links";
import { withCustomLinks } from "../../slate/plugins/custom-links";
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
import { withPaste } from "../../slate/plugins/paste";
import { getDOMRange } from "../../slate/utils/get-dom-range";
import { isEmpty as isEditorEmpty } from "../../slate/utils/is-empty";
import {
  getMarks,
  leaveMarkEdge,
  toggleMark as toggleEditorMark,
} from "../../slate/utils/marks";
import type {
  ComposerBody as ComposerBodyData,
  ComposerBodyAutoLink,
  ComposerBodyCustomLink,
  ComposerBodyMark,
  ComposerBodyMarks,
  ComposerBodyMention,
} from "../../types";
import { isKey } from "../../utils/is-key";
import { Persist, useAnimationPersist, usePersist } from "../../utils/Persist";
import { Portal } from "../../utils/Portal";
import { requestSubmit } from "../../utils/request-submit";
import { useIndex } from "../../utils/use-index";
import { useInitial } from "../../utils/use-initial";
import { useObservable } from "../../utils/use-observable";
import { useRefs } from "../../utils/use-refs";
import { toAbsoluteUrl } from "../Comment/utils";
import {
  ComposerAttachmentsContext,
  ComposerContext,
  ComposerEditorContext,
  ComposerFloatingToolbarContext,
  ComposerSuggestionsContext,
  useComposer,
  useComposerAttachmentsContext,
  useComposerEditorContext,
  useComposerFloatingToolbarContext,
  useComposerSuggestionsContext,
} from "./contexts";
import type {
  ComposerAttachFilesProps,
  ComposerAttachmentsDropAreaProps,
  ComposerEditorComponents,
  ComposerEditorElementProps,
  ComposerEditorFloatingToolbarWrapperProps,
  ComposerEditorLinkWrapperProps,
  ComposerEditorMentionSuggestionsWrapperProps,
  ComposerEditorMentionWrapperProps,
  ComposerEditorProps,
  ComposerFloatingToolbarProps,
  ComposerFormProps,
  ComposerLinkProps,
  ComposerMarkToggleProps,
  ComposerMentionProps,
  ComposerSubmitProps,
  ComposerSuggestionsListItemProps,
  ComposerSuggestionsListProps,
  ComposerSuggestionsProps,
  FloatingPosition,
} from "./types";
import {
  commentBodyToComposerBody,
  composerBodyToCommentBody,
  getSideAndAlignFromFloatingPlacement,
  useComposerAttachmentsDropArea,
  useComposerAttachmentsManager,
  useContentZIndex,
  useFloatingWithOptions,
} from "./utils";

const MENTION_SUGGESTIONS_POSITION: FloatingPosition = "top";

const FLOATING_TOOLBAR_POSITION: FloatingPosition = "top";

const COMPOSER_MENTION_NAME = "ComposerMention";
const COMPOSER_LINK_NAME = "ComposerLink";
const COMPOSER_FLOATING_TOOLBAR_NAME = "ComposerFloatingToolbar";
const COMPOSER_SUGGESTIONS_NAME = "ComposerSuggestions";
const COMPOSER_SUGGESTIONS_LIST_NAME = "ComposerSuggestionsList";
const COMPOSER_SUGGESTIONS_LIST_ITEM_NAME = "ComposerSuggestionsListItem";
const COMPOSER_SUBMIT_NAME = "ComposerSubmit";
const COMPOSER_EDITOR_NAME = "ComposerEditor";
const COMPOSER_ATTACH_FILES_NAME = "ComposerAttachFiles";
const COMPOSER_ATTACHMENTS_DROP_AREA_NAME = "ComposerAttachmentsDropArea";
const COMPOSER_MARK_TOGGLE_NAME = "ComposerMarkToggle";
const COMPOSER_FORM_NAME = "ComposerForm";

const emptyCommentBody: CommentBody = {
  version: 1,
  content: [{ type: "paragraph", children: [{ text: "" }] }],
};

function createComposerEditor({
  createAttachments,
  pasteFilesAsAttachments,
}: {
  createAttachments: (files: File[]) => void;
  pasteFilesAsAttachments?: boolean;
}) {
  return withNormalize(
    withMentions(
      withCustomLinks(
        withAutoLinks(
          withAutoFormatting(
            withEmptyClearFormatting(
              withPaste(withHistory(withReact(createEditor())), {
                createAttachments,
                pasteFilesAsAttachments,
              })
            )
          )
        )
      )
    )
  );
}

function ComposerEditorMentionWrapper({
  Mention,
  attributes,
  children,
  element,
}: ComposerEditorMentionWrapperProps) {
  const isSelected = useSelected();

  return (
    <span {...attributes}>
      {element.id ? (
        <Mention userId={element.id} isSelected={isSelected} />
      ) : null}
      {children}
    </span>
  );
}

function ComposerEditorLinkWrapper({
  Link,
  attributes,
  element,
  children,
}: ComposerEditorLinkWrapperProps) {
  const href = useMemo(
    () => toAbsoluteUrl(element.url) ?? element.url,
    [element.url]
  );

  return (
    <span {...attributes}>
      <Link href={href}>{children}</Link>
    </span>
  );
}

function ComposerEditorMentionSuggestionsWrapper({
  id,
  itemId,
  userIds,
  selectedUserId,
  setSelectedUserId,
  mentionDraft,
  setMentionDraft,
  onItemSelect,
  position = MENTION_SUGGESTIONS_POSITION,
  dir,
  MentionSuggestions,
}: ComposerEditorMentionSuggestionsWrapperProps) {
  const editor = useSlateStatic();
  const { onEditorChange } = useComposerEditorContext();
  const { isFocused } = useComposer();
  const { portalContainer } = useLiveblocksUIConfig();
  const [contentRef, contentZIndex] = useContentZIndex();
  const isOpen =
    isFocused && mentionDraft?.range !== undefined && userIds !== undefined;
  const {
    refs: { setReference, setFloating },
    strategy,
    isPositioned,
    placement,
    x,
    y,
  } = useFloatingWithOptions({
    position,
    dir,
    alignment: "start",
    open: isOpen,
  });

  useObservable(onEditorChange, () => {
    setMentionDraft(getMentionDraftAtSelection(editor));
  });

  useLayoutEffect(() => {
    if (!mentionDraft) {
      setReference(null);

      return;
    }

    const domRange = getDOMRange(editor, mentionDraft.range);
    setReference(domRange ?? null);
  }, [setReference, editor, mentionDraft]);

  return (
    <Persist>
      {isOpen ? (
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
            container={portalContainer}
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
            <MentionSuggestions
              userIds={userIds}
              selectedUserId={selectedUserId}
            />
          </Portal>
        </ComposerSuggestionsContext.Provider>
      ) : null}
    </Persist>
  );
}

function ComposerEditorFloatingToolbarWrapper({
  id,
  position = FLOATING_TOOLBAR_POSITION,
  dir,
  FloatingToolbar,
  hasFloatingToolbarRange,
  setHasFloatingToolbarRange,
}: ComposerEditorFloatingToolbarWrapperProps) {
  const editor = useSlateStatic();
  const { onEditorChange } = useComposerEditorContext();
  const { isFocused } = useComposer();
  const { portalContainer } = useLiveblocksUIConfig();
  const [contentRef, contentZIndex] = useContentZIndex();
  const [isPointerDown, setPointerDown] = useState(false);
  const isOpen = isFocused && !isPointerDown && hasFloatingToolbarRange;
  const {
    refs: { setReference, setFloating },
    strategy,
    isPositioned,
    placement,
    x,
    y,
  } = useFloatingWithOptions({
    type: "range",
    position,
    dir,
    alignment: "center",
    open: isOpen,
  });

  useLayoutEffect(() => {
    if (!isFocused) {
      return;
    }

    const handlePointerDown = () => setPointerDown(true);
    const handlePointerUp = () => setPointerDown(false);

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isFocused]);

  useObservable(onEditorChange, () => {
    // Detach from previous selection range (if any) to avoid sudden jumps
    setReference(null);

    // Then, wait for the next render to ensure the selection is updated
    requestAnimationFrame(() => {
      const domSelection = window.getSelection();

      // Finally, show the toolbar if there's a selection range
      if (
        !editor.selection ||
        SlateRange.isCollapsed(editor.selection) ||
        !domSelection ||
        !domSelection.rangeCount
      ) {
        setHasFloatingToolbarRange(false);
        setReference(null);
      } else {
        setHasFloatingToolbarRange(true);

        const domRange = domSelection.getRangeAt(0);
        setReference(domRange);
      }
    });
  });

  return (
    <Persist>
      {isOpen ? (
        <ComposerFloatingToolbarContext.Provider
          value={{
            id,
            placement,
            dir,
            ref: contentRef,
          }}
        >
          <Portal
            ref={setFloating}
            container={portalContainer}
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
            <FloatingToolbar />
          </Portal>
        </ComposerFloatingToolbarContext.Provider>
      ) : null}
    </Persist>
  );
}

/**
 * Displays a floating toolbar attached to the selection within `Composer.Editor`.
 *
 * @example
 * <Composer.FloatingToolbar>
 *   <Composer.MarkToggle mark="bold">Bold</Composer.MarkToggle>
 *   <Composer.MarkToggle mark="italic">Italic</Composer.MarkToggle>
 * </Composer.FloatingToolbar>
 */
const ComposerFloatingToolbar = forwardRef<
  HTMLDivElement,
  ComposerFloatingToolbarProps
>(({ children, onPointerDown, style, asChild, ...props }, forwardedRef) => {
  const [isPresent] = usePersist();
  const ref = useRef<HTMLDivElement>(null);
  const {
    id,
    ref: contentRef,
    placement,
    dir,
  } = useComposerFloatingToolbarContext(COMPOSER_FLOATING_TOOLBAR_NAME);
  const mergedRefs = useRefs(forwardedRef, contentRef, ref);
  const [side, align] = useMemo(
    () => getSideAndAlignFromFloatingPlacement(placement),
    [placement]
  );
  const Component = asChild ? Slot : "div";
  useAnimationPersist(ref);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);

      event.preventDefault();
      event.stopPropagation();
    },
    [onPointerDown]
  );

  return (
    <Component
      dir={dir}
      role="toolbar"
      id={id}
      aria-label="Floating toolbar"
      {...props}
      onPointerDown={handlePointerDown}
      data-state={isPresent ? "open" : "closed"}
      data-side={side}
      data-align={align}
      style={{
        display: "flex",
        flexDirection: "row",
        maxWidth: "var(--lb-composer-floating-available-width)",
        overflowX: "auto",
        ...style,
      }}
      ref={mergedRefs}
    >
      {children}
    </Component>
  );
});

function ComposerEditorElement({
  Mention,
  Link,
  ...props
}: ComposerEditorElementProps) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { attributes, children, element } = props;

  switch (element.type) {
    case "mention":
      return (
        <ComposerEditorMentionWrapper
          Mention={Mention}
          {...(props as RenderElementSpecificProps<ComposerBodyMention>)}
        />
      );
    case "auto-link":
    case "custom-link":
      return (
        <ComposerEditorLinkWrapper
          Link={Link}
          {...(props as RenderElementSpecificProps<
            ComposerBodyAutoLink | ComposerBodyCustomLink
          >)}
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

function ComposerEditorPlaceholder({
  attributes,
  children,
}: RenderPlaceholderProps) {
  const { opacity: _opacity, ...style } = attributes.style;

  return (
    <span {...attributes} style={style} data-placeholder="">
      {children}
    </span>
  );
}

/**
 * Displays mentions within `Composer.Editor`.
 *
 * @example
 * <Composer.Mention>@{userId}</Composer.Mention>
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
 * Displays links within `Composer.Editor`.
 *
 * @example
 * <Composer.Link href={href}>{children}</Composer.Link>
 */
const ComposerLink = forwardRef<HTMLAnchorElement, ComposerLinkProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "a";

    return (
      <Component
        target="_blank"
        rel="noopener noreferrer nofollow"
        {...props}
        ref={forwardedRef}
      >
        {children}
      </Component>
    );
  }
);

/**
 * Contains suggestions within `Composer.Editor`.
 */
const ComposerSuggestions = forwardRef<
  HTMLDivElement,
  ComposerSuggestionsProps
>(({ children, style, asChild, ...props }, forwardedRef) => {
  const [isPresent] = usePersist();
  const ref = useRef<HTMLDivElement>(null);
  const {
    ref: contentRef,
    placement,
    dir,
  } = useComposerSuggestionsContext(COMPOSER_SUGGESTIONS_NAME);
  const mergedRefs = useRefs(forwardedRef, contentRef, ref);
  const [side, align] = useMemo(
    () => getSideAndAlignFromFloatingPlacement(placement),
    [placement]
  );
  const Component = asChild ? Slot : "div";
  useAnimationPersist(ref);

  return (
    <Component
      dir={dir}
      {...props}
      data-state={isPresent ? "open" : "closed"}
      data-side={side}
      data-align={align}
      style={{
        display: "flex",
        flexDirection: "column",
        maxHeight: "var(--lb-composer-floating-available-height)",
        overflowY: "auto",
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
 * <Composer.SuggestionsList>
 *   {userIds.map((userId) => (
 *     <Composer.SuggestionsListItem key={userId} value={userId}>
 *       @{userId}
 *     </Composer.SuggestionsListItem>
 *   ))}
 * </Composer.SuggestionsList>
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
 * <Composer.SuggestionsListItem key={userId} value={userId}>
 *   @{userId}
 * </Composer.SuggestionsListItem>
 */
const ComposerSuggestionsListItem = forwardRef<
  HTMLLIElement,
  ComposerSuggestionsListItemProps
>(
  (
    {
      value,
      children,
      onPointerMove,
      onPointerDown,
      onClick,
      asChild,
      ...props
    },
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

        event.preventDefault();
        event.stopPropagation();
      },
      [onPointerDown]
    );

    const handleClick = useCallback(
      (event: MouseEvent<HTMLLIElement>) => {
        onClick?.(event);

        const wasDefaultPrevented = event.isDefaultPrevented();

        event.preventDefault();
        event.stopPropagation();

        if (!wasDefaultPrevented) {
          onItemSelect(value);
        }
      },
      [onClick, onItemSelect, value]
    );

    return (
      <Component
        role="option"
        id={id}
        data-selected={isSelected || undefined}
        aria-selected={isSelected || undefined}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        {...props}
        ref={mergedRefs}
      >
        {children}
      </Component>
    );
  }
);

const defaultEditorComponents: ComposerEditorComponents = {
  Link: ({ href, children }) => {
    return <ComposerLink href={href}>{children}</ComposerLink>;
  },
  Mention: ({ userId }) => {
    return (
      <ComposerMention>
        {MENTION_CHARACTER}
        {userId}
      </ComposerMention>
    );
  },
  MentionSuggestions: ({ userIds }) => {
    return userIds.length > 0 ? (
      <ComposerSuggestions>
        <ComposerSuggestionsList>
          {userIds.map((userId) => (
            <ComposerSuggestionsListItem key={userId} value={userId}>
              {userId}
            </ComposerSuggestionsListItem>
          ))}
        </ComposerSuggestionsList>
      </ComposerSuggestions>
    ) : null;
  },
};

/**
 * Displays the composer's editor.
 *
 * @example
 * <Composer.Editor placeholder="Write a comment…" />
 */
const ComposerEditor = forwardRef<HTMLDivElement, ComposerEditorProps>(
  (
    {
      defaultValue,
      onKeyDown,
      onFocus,
      onBlur,
      disabled,
      autoFocus,
      components,
      dir,
      ...props
    },
    forwardedRef
  ) => {
    const client = useClientOrNull();
    const { editor, validate, setFocused, onEditorChange, roomId } =
      useComposerEditorContext();
    const {
      submit,
      focus,
      blur,
      select,
      canSubmit,
      isDisabled: isComposerDisabled,
      isFocused,
    } = useComposer();
    const isDisabled = isComposerDisabled || disabled;
    const initialBody = useInitial(defaultValue ?? emptyCommentBody);
    const initialEditorValue = useMemo(() => {
      return commentBodyToComposerBody(initialBody);
    }, [initialBody]);
    const { Link, Mention, MentionSuggestions, FloatingToolbar } = useMemo(
      () => ({ ...defaultEditorComponents, ...components }),
      [components]
    );

    const [hasFloatingToolbarRange, setHasFloatingToolbarRange] =
      useState(false);
    // If used with LiveblocksProvider but without resolveMentionSuggestions,
    // we can skip the mention suggestions logic entirely
    const resolveMentionSuggestions = useResolveMentionSuggestions();
    const hasResolveMentionSuggestions = client
      ? resolveMentionSuggestions
      : true;
    const [mentionDraft, setMentionDraft] = useState<MentionDraft>();
    const mentionSuggestions = useMentionSuggestions(
      roomId,
      mentionDraft?.text
    );
    const [
      selectedMentionSuggestionIndex,
      setPreviousSelectedMentionSuggestionIndex,
      setNextSelectedMentionSuggestionIndex,
      setSelectedMentionSuggestionIndex,
    ] = useIndex(0, mentionSuggestions?.length ?? 0);
    const id = useId();
    const floatingToolbarId = useMemo(
      () => `liveblocks-floating-toolbar-${id}`,
      [id]
    );
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
          <ComposerEditorElement Mention={Mention} Link={Link} {...props} />
        );
      },
      [Link, Mention]
    );

    const handleChange = useCallback(
      (value: SlateDescendant[]) => {
        validate(value as SlateElement[]);

        // Our multi-component setup requires us to instantiate the editor in `Composer.Form`
        // but we can only listen to changes here in `Composer.Editor` via `Slate`, so we use
        // an event source to notify `Composer.Form` of changes.
        onEditorChange.notify();
      },
      [validate, onEditorChange]
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
          if (hasFloatingToolbarRange) {
            // Close the floating toolbar on Escape
            if (isKey(event, "Escape")) {
              event.preventDefault();
              setHasFloatingToolbarRange(false);
            }
          }

          // Blur the editor on Escape
          if (isKey(event, "Escape")) {
            event.preventDefault();
            blur();
          }

          // Submit the editor on Enter
          if (isKey(event, "Enter", { shift: false })) {
            // Even if submitting is not possible, don't do anything else on Enter. (e.g. creating a new line)
            event.preventDefault();

            if (canSubmit) {
              submit();
            }
          }

          // Create a new line on Shift + Enter
          if (isKey(event, "Enter", { shift: true })) {
            event.preventDefault();
            editor.insertBreak();
          }

          // Toggle bold on Command/Control + B
          if (isKey(event, "b", { mod: true })) {
            event.preventDefault();
            toggleEditorMark(editor, "bold");
          }

          // Toggle italic on Command/Control + I
          if (isKey(event, "i", { mod: true })) {
            event.preventDefault();
            toggleEditorMark(editor, "italic");
          }

          // Toggle strikethrough on Command/Control + Shift + S
          if (isKey(event, "s", { mod: true, shift: true })) {
            event.preventDefault();
            toggleEditorMark(editor, "strikethrough");
          }

          // Toggle code on Command/Control + E
          if (isKey(event, "e", { mod: true })) {
            event.preventDefault();
            toggleEditorMark(editor, "code");
          }
        }
      },
      [
        onKeyDown,
        mentionDraft,
        mentionSuggestions,
        hasFloatingToolbarRange,
        editor,
        setNextSelectedMentionSuggestionIndex,
        setPreviousSelectedMentionSuggestionIndex,
        selectedMentionSuggestionIndex,
        createMention,
        setSelectedMentionSuggestionIndex,
        blur,
        canSubmit,
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

    const additionalProps: AriaAttributes = useMemo(
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
          : hasFloatingToolbarRange
            ? {
                "aria-haspopup": true,
                "aria-controls": floatingToolbarId,
              }
            : {},
      [
        mentionDraft,
        suggestionsListId,
        suggestionsListItemId,
        selectedMentionSuggestionUserId,
        hasFloatingToolbarRange,
        floatingToolbarId,
      ]
    );

    useImperativeHandle(forwardedRef, () => {
      return ReactEditor.toDOMNode(editor, editor) as HTMLDivElement;
    }, [editor]);

    // Manually focus the editor when `autoFocus` is true
    useLayoutEffect(() => {
      if (autoFocus) {
        focus();
      }
    }, [autoFocus, editor, focus]);

    // Manually add a selection in the editor if the selection
    // is still empty after being focused
    useLayoutEffect(() => {
      if (isFocused && editor.selection === null) {
        select();
      }
    }, [editor, select, isFocused]);

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
          aria-label="Composer editor"
          data-focused={isFocused || undefined}
          data-disabled={isDisabled || undefined}
          {...additionalProps}
          {...props}
          readOnly={isDisabled}
          disabled={isDisabled}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          renderElement={renderElement}
          renderLeaf={ComposerEditorLeaf}
          renderPlaceholder={ComposerEditorPlaceholder}
        />
        {hasResolveMentionSuggestions && (
          <ComposerEditorMentionSuggestionsWrapper
            dir={dir}
            mentionDraft={mentionDraft}
            setMentionDraft={setMentionDraft}
            selectedUserId={selectedMentionSuggestionUserId}
            setSelectedUserId={setSelectedMentionSuggestionUserId}
            userIds={mentionSuggestions}
            id={suggestionsListId}
            itemId={suggestionsListItemId}
            onItemSelect={createMention}
            MentionSuggestions={MentionSuggestions}
          />
        )}
        {FloatingToolbar && (
          <ComposerEditorFloatingToolbarWrapper
            dir={dir}
            id={floatingToolbarId}
            hasFloatingToolbarRange={hasFloatingToolbarRange}
            setHasFloatingToolbarRange={setHasFloatingToolbarRange}
            FloatingToolbar={FloatingToolbar}
          />
        )}
      </Slate>
    );
  }
);

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_SIZE = 1024 * 1024 * 1024; // 1 GB

function prepareAttachment(file: File): CommentLocalAttachment {
  return {
    type: "localAttachment",
    status: "idle",
    id: createCommentAttachmentId(),
    name: file.name,
    size: file.size,
    mimeType: file.type,
    file,
  };
}

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
    {
      children,
      onSubmit,
      onComposerSubmit,
      defaultAttachments = [],
      pasteFilesAsAttachments,
      preventUnsavedChanges = true,
      disabled,
      asChild,
      roomId: _roomId,
      ...props
    },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "form";
    const [isEmpty, setEmpty] = useState(true);
    const [isSubmitting, setSubmitting] = useState(false);
    const [isFocused, setFocused] = useState(false);
    const room = useRoomOrNull();

    const roomId = _roomId !== undefined ? _roomId : room?.id;
    if (roomId === undefined) {
      throw new Error("Composer.Form must be a descendant of RoomProvider.");
    }

    // Later: Offer as Composer.Form props: { maxAttachments: number; maxAttachmentSize: number; supportedAttachmentMimeTypes: string[]; }
    const maxAttachments = MAX_ATTACHMENTS;
    const maxAttachmentSize = MAX_ATTACHMENT_SIZE;

    const {
      attachments,
      isUploadingAttachments,
      addAttachments,
      removeAttachment,
      clearAttachments,
    } = useComposerAttachmentsManager(defaultAttachments, {
      maxFileSize: maxAttachmentSize,
      roomId,
    });
    const numberOfAttachments = attachments.length;
    const hasMaxAttachments = numberOfAttachments >= maxAttachments;

    const isDisabled = useMemo(() => {
      return isSubmitting || disabled === true;
    }, [isSubmitting, disabled]);
    const canSubmit = useMemo(() => {
      return !isEmpty && !isUploadingAttachments;
    }, [isEmpty, isUploadingAttachments]);
    const [marks, setMarks] = useState<ComposerBodyMarks>(getMarks);

    const ref = useRef<HTMLFormElement>(null);
    const mergedRefs = useRefs(forwardedRef, ref);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const syncSource = useSyncSource();

    // Mark the composer as a pending update when it has unsubmitted (draft)
    // text or attachments
    const isPending = !preventUnsavedChanges
      ? false
      : !isEmpty || isUploadingAttachments || attachments.length > 0;

    useEffect(() => {
      syncSource?.setSyncStatus(
        isPending ? "has-local-changes" : "synchronized"
      );
    }, [syncSource, isPending]);

    const createAttachments = useCallback(
      (files: File[]) => {
        if (!files.length) {
          return;
        }

        const numberOfAcceptedFiles = Math.max(
          0,
          maxAttachments - numberOfAttachments
        );

        files.splice(numberOfAcceptedFiles);

        const attachments = files.map((file) => prepareAttachment(file));

        addAttachments(attachments);
      },
      [addAttachments, maxAttachments, numberOfAttachments]
    );

    const createAttachmentsRef = useRef(createAttachments);

    useEffect(() => {
      createAttachmentsRef.current = createAttachments;
    }, [createAttachments]);

    const stableCreateAttachments = useCallback((files: File[]) => {
      createAttachmentsRef.current(files);
    }, []);

    const editor = useInitial(() =>
      createComposerEditor({
        createAttachments: stableCreateAttachments,
        pasteFilesAsAttachments,
      })
    );
    const onEditorChange = useInitial(makeEventSource) as EventSource<void>;

    const validate = useCallback(
      (value: SlateElement[]) => {
        setEmpty(isEditorEmpty(editor, value));
      },
      [editor]
    );

    const submit = useCallback(() => {
      if (!canSubmit) {
        return;
      }

      // We need to wait for the next frame in some cases like when composing diacritics,
      // we want any native handling to be done first while still being handled on `keydown`.
      requestAnimationFrame(() => {
        if (ref.current) {
          requestSubmit(ref.current);
        }
      });
    }, [canSubmit]);

    const clear = useCallback(() => {
      SlateTransforms.delete(editor, {
        at: {
          anchor: SlateEditor.start(editor, []),
          focus: SlateEditor.end(editor, []),
        },
      });
    }, [editor]);

    const select = useCallback(() => {
      SlateTransforms.select(editor, SlateEditor.end(editor, []));
    }, [editor]);

    const focus = useCallback(
      (resetSelection = true) => {
        if (!ReactEditor.isFocused(editor)) {
          SlateTransforms.select(
            editor,
            resetSelection || !editor.selection
              ? SlateEditor.end(editor, [])
              : editor.selection
          );
          ReactEditor.focus(editor);
        }
      },
      [editor]
    );

    const blur = useCallback(() => {
      ReactEditor.blur(editor);
    }, [editor]);

    const createMention = useCallback(() => {
      if (disabled) {
        return;
      }

      focus();
      insertMentionCharacter(editor);
    }, [disabled, editor, focus]);

    const insertText = useCallback(
      (text: string) => {
        if (disabled) {
          return;
        }

        focus(false);
        insertSlateText(editor, text);
      },
      [disabled, editor, focus]
    );

    const attachFiles = useCallback(() => {
      if (disabled) {
        return;
      }

      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, [disabled]);

    const handleAttachmentsInputChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        if (disabled) {
          return;
        }

        if (event.target.files) {
          createAttachments(Array.from(event.target.files));

          // Reset the input value to allow selecting the same file(s) again
          event.target.value = "";
        }
      },
      [createAttachments, disabled]
    );

    const onSubmitEnd = useCallback(() => {
      clear();
      blur();
      clearAttachments();
      setSubmitting(false);
    }, [blur, clear, clearAttachments]);

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        if (disabled) {
          return;
        }

        // In some situations (e.g. pressing Enter while composing diacritics), it's possible
        // for the form to be submitted as empty even though we already checked whether the
        // editor was empty when handling the key press.
        const isEmpty = isEditorEmpty(editor, editor.children);

        // We even prevent the user's `onSubmit` handler from being called if the editor is empty.
        if (isEmpty) {
          event.preventDefault();

          return;
        }

        onSubmit?.(event);

        if (!onComposerSubmit || event.isDefaultPrevented()) {
          event.preventDefault();

          return;
        }

        const body = composerBodyToCommentBody(
          editor.children as ComposerBodyData
        );
        // Only non-local attachments are included to be submitted.
        const commentAttachments: CommentAttachment[] = attachments
          .filter(
            (attachment) =>
              attachment.type === "attachment" ||
              (attachment.type === "localAttachment" &&
                attachment.status === "uploaded")
          )
          .map((attachment) => {
            return {
              id: attachment.id,
              type: "attachment",
              mimeType: attachment.mimeType,
              size: attachment.size,
              name: attachment.name,
            };
          });

        const promise = onComposerSubmit(
          { body, attachments: commentAttachments },
          event
        );

        event.preventDefault();

        if (promise) {
          setSubmitting(true);
          promise.then(onSubmitEnd);
        } else {
          onSubmitEnd();
        }
      },
      [disabled, editor, attachments, onComposerSubmit, onSubmit, onSubmitEnd]
    );

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const toggleMark = useCallback(
      (mark: ComposerBodyMark) => {
        toggleEditorMark(editor, mark);
      },
      [editor]
    );

    useObservable(onEditorChange, () => {
      setMarks(getMarks(editor));
    });

    return (
      <ComposerEditorContext.Provider
        value={{
          editor,
          validate,
          setFocused,
          onEditorChange,
          roomId,
        }}
      >
        <ComposerAttachmentsContext.Provider
          value={{
            createAttachments,
            isUploadingAttachments,
            hasMaxAttachments,
            maxAttachments,
            maxAttachmentSize,
          }}
        >
          <ComposerContext.Provider
            value={{
              isDisabled,
              isFocused,
              isEmpty,
              canSubmit,
              submit,
              clear,
              select,
              focus,
              blur,
              createMention,
              insertText,
              attachments,
              attachFiles,
              removeAttachment,
              toggleMark,
              marks,
            }}
          >
            <Component {...props} onSubmit={handleSubmit} ref={mergedRefs}>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleAttachmentsInputChange}
                onClick={stopPropagation}
                tabIndex={-1}
                style={{ display: "none" }}
              />
              <Slottable>{children}</Slottable>
            </Component>
          </ComposerContext.Provider>
        </ComposerAttachmentsContext.Provider>
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
    const { canSubmit, isDisabled: isComposerDisabled } = useComposer();
    const isDisabled = isComposerDisabled || disabled || !canSubmit;

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

/**
 * A button which opens a file picker to create attachments.
 *
 * @example
 * <Composer.AttachFiles>Attach files</Composer.AttachFiles>
 */
const ComposerAttachFiles = forwardRef<
  HTMLButtonElement,
  ComposerAttachFilesProps
>(({ children, onClick, disabled, asChild, ...props }, forwardedRef) => {
  const Component = asChild ? Slot : "button";
  const { hasMaxAttachments } = useComposerAttachmentsContext();
  const { isDisabled: isComposerDisabled, attachFiles } = useComposer();
  const isDisabled = isComposerDisabled || hasMaxAttachments || disabled;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.isDefaultPrevented()) {
        attachFiles();
      }
    },
    [attachFiles, onClick]
  );

  return (
    <Component
      type="button"
      {...props}
      onClick={handleClick}
      ref={forwardedRef}
      disabled={isDisabled}
    >
      {children}
    </Component>
  );
});

/**
 * A drop area which accepts files to create attachments.
 *
 * @example
 * <Composer.AttachmentsDropArea>
 *   Drop files here
 * </Composer.AttachmentsDropArea>
 */
const ComposerAttachmentsDropArea = forwardRef<
  HTMLDivElement,
  ComposerAttachmentsDropAreaProps
>(
  (
    {
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
      disabled,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "div";
    const { isDisabled: isComposerDisabled } = useComposer();
    const isDisabled = isComposerDisabled || disabled;
    const [, dropAreaProps] = useComposerAttachmentsDropArea({
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
      disabled: isDisabled,
    });

    return (
      <Component
        {...dropAreaProps}
        data-disabled={isDisabled ? "" : undefined}
        {...props}
        ref={forwardedRef}
      />
    );
  }
);

/**
 * A toggle button which toggles a specific text mark.
 *
 * @example
 * <Composer.MarkToggle mark="bold">
 *   Bold
 * </Composer.MarkToggle>
 */
const ComposerMarkToggle = forwardRef<
  HTMLButtonElement,
  ComposerMarkToggleProps
>(
  (
    { children, mark, onValueChange, onClick, asChild, ...props },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "button";
    const { marks, toggleMark } = useComposer();

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);

        if (!event.isDefaultPrevented()) {
          toggleMark(mark);
          onValueChange?.(mark);
        }
      },
      [mark, onClick, onValueChange, toggleMark]
    );

    return (
      <TogglePrimitive.Root
        asChild
        pressed={marks[mark]}
        onClick={handleClick}
        {...props}
      >
        <Component {...props} ref={forwardedRef}>
          {children}
        </Component>
      </TogglePrimitive.Root>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  ComposerAttachFiles.displayName = COMPOSER_ATTACH_FILES_NAME;
  ComposerAttachmentsDropArea.displayName = COMPOSER_ATTACHMENTS_DROP_AREA_NAME;
  ComposerEditor.displayName = COMPOSER_EDITOR_NAME;
  ComposerFloatingToolbar.displayName = COMPOSER_FLOATING_TOOLBAR_NAME;
  ComposerForm.displayName = COMPOSER_FORM_NAME;
  ComposerMention.displayName = COMPOSER_MENTION_NAME;
  ComposerLink.displayName = COMPOSER_LINK_NAME;
  ComposerSubmit.displayName = COMPOSER_SUBMIT_NAME;
  ComposerSuggestions.displayName = COMPOSER_SUGGESTIONS_NAME;
  ComposerSuggestionsList.displayName = COMPOSER_SUGGESTIONS_LIST_NAME;
  ComposerSuggestionsListItem.displayName = COMPOSER_SUGGESTIONS_LIST_ITEM_NAME;
  ComposerMarkToggle.displayName = COMPOSER_MARK_TOGGLE_NAME;
}

// NOTE: Every export from this file will be available publicly as Composer.*
export {
  ComposerAttachFiles as AttachFiles,
  ComposerAttachmentsDropArea as AttachmentsDropArea,
  ComposerEditor as Editor,
  ComposerFloatingToolbar as FloatingToolbar,
  ComposerForm as Form,
  ComposerLink as Link,
  ComposerMarkToggle as MarkToggle,
  ComposerMention as Mention,
  ComposerSubmit as Submit,
  ComposerSuggestions as Suggestions,
  ComposerSuggestionsList as SuggestionsList,
  ComposerSuggestionsListItem as SuggestionsListItem,
};
