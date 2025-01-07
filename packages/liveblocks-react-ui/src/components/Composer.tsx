"use client";

import type {
  BaseMetadata,
  CommentAttachment,
  CommentMixedAttachment,
  DM,
} from "@liveblocks/core";
import { Permission } from "@liveblocks/core";
import {
  useCreateRoomComment,
  useCreateRoomThread,
  useEditRoomComment,
  useLayoutEffect,
  useResolveMentionSuggestions,
  useRoomOrNull,
  useRoomPermissions,
} from "@liveblocks/react/_private";
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  FocusEvent,
  FormEvent,
  ForwardedRef,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  RefAttributes,
  SyntheticEvent,
} from "react";
import {
  createContext,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { useLiveblocksUIConfig } from "../config";
import { FLOATING_ELEMENT_SIDE_OFFSET } from "../constants";
import { AttachmentIcon } from "../icons/Attachment";
import { BoldIcon } from "../icons/Bold";
import { CodeIcon } from "../icons/Code";
import { EmojiIcon } from "../icons/Emoji";
import { ItalicIcon } from "../icons/Italic";
import { MentionIcon } from "../icons/Mention";
import { SendIcon } from "../icons/Send";
import { StrikethroughIcon } from "../icons/Strikethrough";
import type { ComposerOverrides, GlobalOverrides } from "../overrides";
import { useOverrides } from "../overrides";
import * as ComposerPrimitive from "../primitives/Composer";
import {
  useComposer,
  useComposerAttachmentsContext,
  useComposerEditorContext,
} from "../primitives/Composer/contexts";
import type {
  ComposerEditorComponents,
  ComposerEditorLinkProps,
  ComposerEditorMentionProps,
  ComposerEditorMentionSuggestionsProps,
  ComposerEditorProps,
  ComposerFormProps,
  ComposerMarkToggleProps,
  ComposerSubmitComment,
} from "../primitives/Composer/types";
import { useComposerAttachmentsDropArea } from "../primitives/Composer/utils";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import type { ComposerBodyMark } from "../types";
import { classNames } from "../utils/class-names";
import { useControllableState } from "../utils/use-controllable-state";
import { FileAttachment } from "./internal/Attachment";
import { Attribution } from "./internal/Attribution";
import { Avatar } from "./internal/Avatar";
import { Button } from "./internal/Button";
import type { EmojiPickerProps } from "./internal/EmojiPicker";
import { EmojiPicker, EmojiPickerTrigger } from "./internal/EmojiPicker";
import {
  ShortcutTooltip,
  ShortcutTooltipKey,
  Tooltip,
  TooltipProvider,
} from "./internal/Tooltip";
import { User } from "./internal/User";

interface EditorActionProps extends ComponentPropsWithoutRef<"button"> {
  label: string;
  tooltipLabel?: string;
}

interface EmojiEditorActionProps extends EditorActionProps {
  onPickerOpenChange?: EmojiPickerProps["onOpenChange"];
}

interface MarkToggleProps extends ComposerMarkToggleProps {
  shortcut?: ReactNode;
}

type ComposerCreateThreadProps<M extends BaseMetadata> = {
  threadId?: never;
  commentId?: never;

  /**
   * The metadata of the thread to create.
   */
  metadata?: M;
};

type ComposerCreateCommentProps = {
  /**
   * The ID of the thread to reply to.
   */
  threadId: string;
  commentId?: never;
  metadata?: never;
};

type ComposerEditCommentProps = {
  /**
   * The ID of the thread to edit a comment in.
   */
  threadId: string;

  /**
   * The ID of the comment to edit.
   */
  commentId: string;
  metadata?: never;
};

export type ComposerProps<M extends BaseMetadata = DM> = Omit<
  ComponentPropsWithoutRef<"form">,
  "defaultValue"
> &
  (
    | ComposerCreateThreadProps<M>
    | ComposerCreateCommentProps
    | ComposerEditCommentProps
  ) & {
    /**
     * The event handler called when the composer is submitted.
     */
    onComposerSubmit?: (
      comment: ComposerSubmitComment,
      event: FormEvent<HTMLFormElement>
    ) => Promise<void> | void;

    /**
     * The composer's initial value.
     */
    defaultValue?: ComposerEditorProps["defaultValue"];

    /**
     * The composer's initial attachments.
     */
    defaultAttachments?: CommentAttachment[];

    /**
     * Whether the composer is collapsed. Setting a value will make the composer controlled.
     */
    collapsed?: boolean;

    /**
     * The event handler called when the collapsed state of the composer changes.
     */
    onCollapsedChange?: (collapsed: boolean) => void;

    /**
     * Whether the composer is initially collapsed. Setting a value will make the composer uncontrolled.
     */
    defaultCollapsed?: boolean;

    /**
     * Whether to show and allow adding attachments.
     */
    showAttachments?: boolean;

    /**
     * Whether to show formatting controls (e.g. a floating toolbar with formatting toggles when selecting text)
     */
    showFormattingControls?: boolean;

    /**
     * Whether the composer is disabled.
     */
    disabled?: ComposerFormProps["disabled"];

    /**
     * Whether to focus the composer on mount.
     */
    autoFocus?: ComposerEditorProps["autoFocus"];

    /**
     * Override the component's strings.
     */
    overrides?: Partial<GlobalOverrides & ComposerOverrides>;

    /**
     * @internal
     */
    actions?: ReactNode;

    /**
     * @internal
     */
    showAttribution?: boolean;

    /**
     * @internal
     */
    roomId?: string;
  };

interface ComposerEditorContainerProps
  extends Pick<
    ComposerProps,
    | "defaultValue"
    | "showAttachments"
    | "showFormattingControls"
    | "showAttribution"
    | "overrides"
    | "actions"
    | "autoFocus"
    | "disabled"
  > {
  isCollapsed: boolean | undefined;
  onEmptyChange: (isEmpty: boolean) => void;
  hasResolveMentionSuggestions: boolean;
  onEmojiPickerOpenChange: (isOpen: boolean) => void;
  onEditorClick: (event: MouseEvent<HTMLDivElement>) => void;
}

function ComposerInsertMentionEditorAction({
  label,
  tooltipLabel,
  className,
  onClick,
  ...props
}: EditorActionProps) {
  const { createMention } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (!event.isDefaultPrevented()) {
        event.stopPropagation();
        createMention();
      }
    },
    [createMention, onClick]
  );

  return (
    <Tooltip content={tooltipLabel ?? label}>
      <Button
        className={classNames("lb-composer-editor-action", className)}
        onPointerDown={preventDefault}
        onClick={handleClick}
        aria-label={label}
        {...props}
      >
        <MentionIcon className="lb-button-icon" />
      </Button>
    </Tooltip>
  );
}

function ComposerInsertEmojiEditorAction({
  label,
  tooltipLabel,
  onPickerOpenChange,
  className,
  ...props
}: EmojiEditorActionProps) {
  const { insertText } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <EmojiPicker onEmojiSelect={insertText} onOpenChange={onPickerOpenChange}>
      <Tooltip content={tooltipLabel ?? label}>
        <EmojiPickerTrigger asChild>
          <Button
            className={classNames("lb-composer-editor-action", className)}
            onPointerDown={preventDefault}
            onClick={stopPropagation}
            aria-label={label}
            {...props}
          >
            <EmojiIcon className="lb-button-icon" />
          </Button>
        </EmojiPickerTrigger>
      </Tooltip>
    </EmojiPicker>
  );
}

function ComposerAttachFilesEditorAction({
  label,
  tooltipLabel,
  className,
  ...props
}: EditorActionProps) {
  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <Tooltip content={tooltipLabel ?? label}>
      <ComposerPrimitive.AttachFiles asChild>
        <Button
          className={classNames("lb-composer-editor-action", className)}
          onPointerDown={preventDefault}
          onClick={stopPropagation}
          aria-label={label}
          {...props}
        >
          <AttachmentIcon className="lb-button-icon" />
        </Button>
      </ComposerPrimitive.AttachFiles>
    </Tooltip>
  );
}

function ComposerMention({ userId }: ComposerEditorMentionProps) {
  return (
    <ComposerPrimitive.Mention className="lb-composer-mention">
      {MENTION_CHARACTER}
      <User userId={userId} />
    </ComposerPrimitive.Mention>
  );
}

function ComposerMentionSuggestions({
  userIds,
}: ComposerEditorMentionSuggestionsProps) {
  return userIds.length > 0 ? (
    <ComposerPrimitive.Suggestions className="lb-root lb-portal lb-elevation lb-composer-suggestions lb-composer-mention-suggestions">
      <ComposerPrimitive.SuggestionsList className="lb-composer-suggestions-list lb-composer-mention-suggestions-list">
        {userIds.map((userId) => (
          <ComposerPrimitive.SuggestionsListItem
            key={userId}
            className="lb-composer-suggestions-list-item lb-composer-mention-suggestion"
            value={userId}
          >
            <Avatar
              userId={userId}
              className="lb-composer-mention-suggestion-avatar"
            />
            <User
              userId={userId}
              className="lb-composer-mention-suggestion-user"
            />
          </ComposerPrimitive.SuggestionsListItem>
        ))}
      </ComposerPrimitive.SuggestionsList>
    </ComposerPrimitive.Suggestions>
  ) : null;
}

function MarkToggle({ mark, shortcut, children, ...props }: MarkToggleProps) {
  const $ = useOverrides();
  const label = useMemo(() => {
    return $.COMPOSER_TOGGLE_MARK(mark);
  }, [$, mark]);

  return (
    <ShortcutTooltip
      content={label}
      shortcut={shortcut}
      sideOffset={FLOATING_ELEMENT_SIDE_OFFSET + 2}
    >
      <ComposerPrimitive.MarkToggle mark={mark} asChild {...props}>
        <Button aria-label={label} variant="toggle">
          {children}
        </Button>
      </ComposerPrimitive.MarkToggle>
    </ShortcutTooltip>
  );
}

type MarkToggles = {
  [K in ComposerBodyMark]: ComponentType<PropsWithChildren>;
};

const markToggles: MarkToggles = {
  bold: () => (
    <MarkToggle
      mark="bold"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <span>B</span>
        </>
      }
    >
      <BoldIcon />
    </MarkToggle>
  ),
  italic: () => (
    <MarkToggle
      mark="italic"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <span>I</span>
        </>
      }
    >
      <ItalicIcon />
    </MarkToggle>
  ),
  strikethrough: () => (
    <MarkToggle
      mark="strikethrough"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <ShortcutTooltipKey name="shift" />
          <span>S</span>
        </>
      }
    >
      <StrikethroughIcon />
    </MarkToggle>
  ),
  code: () => (
    <MarkToggle
      mark="code"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <span>E</span>
        </>
      }
    >
      <CodeIcon />
    </MarkToggle>
  ),
};

const markTogglesList = Object.entries(markToggles).map(([mark, Toggle]) => (
  <Toggle key={mark} />
));

function ComposerFloatingToolbar() {
  return (
    <ComposerPrimitive.FloatingToolbar className="lb-root lb-portal lb-elevation lb-composer-floating-toolbar">
      {markTogglesList}
    </ComposerPrimitive.FloatingToolbar>
  );
}

function ComposerLink({ href, children }: ComposerEditorLinkProps) {
  return (
    <ComposerPrimitive.Link href={href} className="lb-composer-link">
      {children}
    </ComposerPrimitive.Link>
  );
}

interface ComposerAttachmentsProps extends ComponentPropsWithoutRef<"div"> {
  overrides?: Partial<GlobalOverrides & ComposerOverrides>;
}

interface ComposerFileAttachmentProps extends ComponentPropsWithoutRef<"div"> {
  attachment: CommentMixedAttachment;
  overrides?: Partial<GlobalOverrides & ComposerOverrides>;
}

function ComposerFileAttachment({
  attachment,
  className,
  overrides,
  ...props
}: ComposerFileAttachmentProps) {
  const { removeAttachment } = useComposer();
  const { roomId } = useComposerEditorContext();

  const handleDeleteClick = useCallback(() => {
    removeAttachment(attachment.id);
  }, [attachment.id, removeAttachment]);

  return (
    <FileAttachment
      className={classNames("lb-composer-attachment", className)}
      {...props}
      attachment={attachment}
      onDeleteClick={handleDeleteClick}
      preventFocusOnDelete
      overrides={overrides}
      roomId={roomId}
    />
  );
}

function ComposerAttachments({
  overrides,
  className,
  ...props
}: ComposerAttachmentsProps) {
  const { attachments } = useComposer();

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div
      className={classNames("lb-composer-attachments", className)}
      {...props}
    >
      <div className="lb-attachments">
        {attachments.map((attachment) => {
          return (
            <ComposerFileAttachment
              key={attachment.id}
              attachment={attachment}
              overrides={overrides}
            />
          );
        })}
      </div>
    </div>
  );
}

const editorRequiredComponents: ComposerEditorComponents = {
  Mention: ComposerMention,
  MentionSuggestions: ComposerMentionSuggestions,
  Link: ComposerLink,
};

function ComposerEditorContainer({
  showAttachments = true,
  showFormattingControls = true,
  showAttribution,
  defaultValue,
  isCollapsed,
  overrides,
  actions,
  autoFocus,
  disabled,
  hasResolveMentionSuggestions,
  onEmojiPickerOpenChange,
  onEmptyChange,
  onEditorClick,
}: ComposerEditorContainerProps) {
  const { isEmpty } = useComposer();
  const { hasMaxAttachments } = useComposerAttachmentsContext();
  const $ = useOverrides(overrides);
  const components = useMemo(() => {
    return {
      ...editorRequiredComponents,
      FloatingToolbar: showFormattingControls
        ? ComposerFloatingToolbar
        : undefined,
    };
  }, [showFormattingControls]);

  const [isDraggingOver, dropAreaProps] = useComposerAttachmentsDropArea({
    disabled: disabled || hasMaxAttachments,
  });

  useLayoutEffect(() => {
    onEmptyChange(isEmpty);
  }, [isEmpty, onEmptyChange]);

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <div className="lb-composer-editor-container" {...dropAreaProps}>
      <ComposerPrimitive.Editor
        className="lb-composer-editor"
        onClick={onEditorClick}
        placeholder={$.COMPOSER_PLACEHOLDER}
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        components={components}
        disabled={disabled}
        dir={$.dir}
      />
      {showAttachments && <ComposerAttachments overrides={overrides} />}
      {(!isCollapsed || isDraggingOver) && (
        <div className="lb-composer-footer">
          <div className="lb-composer-editor-actions">
            {hasResolveMentionSuggestions && (
              <ComposerInsertMentionEditorAction
                label={$.COMPOSER_INSERT_MENTION}
                disabled={disabled}
              />
            )}
            <ComposerInsertEmojiEditorAction
              label={$.COMPOSER_INSERT_EMOJI}
              onPickerOpenChange={onEmojiPickerOpenChange}
              disabled={disabled}
            />
            {showAttachments && (
              <ComposerAttachFilesEditorAction
                label={$.COMPOSER_ATTACH_FILES}
                disabled={disabled}
              />
            )}
          </div>
          {showAttribution && <Attribution />}
          <div className="lb-composer-actions">
            {actions ?? (
              <>
                <ShortcutTooltip
                  content={$.COMPOSER_SEND}
                  shortcut={<ShortcutTooltipKey name="enter" />}
                >
                  <ComposerPrimitive.Submit asChild>
                    <Button
                      onPointerDown={preventDefault}
                      onClick={stopPropagation}
                      className="lb-composer-action"
                      variant="primary"
                      aria-label={$.COMPOSER_SEND}
                    >
                      <SendIcon />
                    </Button>
                  </ComposerPrimitive.Submit>
                </ShortcutTooltip>
              </>
            )}
          </div>
        </div>
      )}
      {showAttachments && isDraggingOver && (
        <div className="lb-composer-attachments-drop-area">
          <div className="lb-composer-attachments-drop-area-label">
            <AttachmentIcon />
            {$.COMPOSER_ATTACH_FILES}
          </div>
        </div>
      )}
    </div>
  );
}

export const ComposerRoomIdContext = createContext<string | null>(null);

/**
 * Displays a composer to create comments.
 *
 * @example
 * <Composer />
 */
export const Composer = forwardRef(
  <M extends BaseMetadata = DM>(
    {
      threadId,
      commentId,
      metadata,
      defaultValue,
      defaultAttachments,
      onComposerSubmit,
      collapsed: controlledCollapsed,
      defaultCollapsed,
      onCollapsedChange: controlledOnCollapsedChange,
      overrides,
      actions,
      onBlur,
      className,
      onFocus,
      autoFocus,
      disabled,
      showAttachments = true,
      showFormattingControls = true,
      showAttribution,
      roomId: _roomId,
      ...props
    }: ComposerProps<M>,
    forwardedRef: ForwardedRef<HTMLFormElement>
  ) => {
    const room = useRoomOrNull();

    const roomId = _roomId !== undefined ? _roomId : room?.id;
    if (roomId === undefined) {
      throw new Error(
        "Composer must be a descendant of RoomProvider component"
      );
    }

    const createThread = useCreateRoomThread(roomId);
    const createComment = useCreateRoomComment(roomId);
    const editComment = useEditRoomComment(roomId);
    const { preventUnsavedComposerChanges } = useLiveblocksUIConfig();
    const hasResolveMentionSuggestions =
      useResolveMentionSuggestions() !== undefined;
    const isEmptyRef = useRef(true);
    const isEmojiPickerOpenRef = useRef(false);
    const $ = useOverrides(overrides);
    const [isCollapsed, onCollapsedChange] = useControllableState(
      // If the composer is neither controlled nor uncontrolled, it defaults to controlled as uncollapsed.
      controlledCollapsed === undefined && defaultCollapsed === undefined
        ? false
        : controlledCollapsed,
      controlledOnCollapsedChange,
      defaultCollapsed
    );

    const canCommentFallback = useSyncExternalStore(
      useCallback(
        (callback) => {
          if (room === null) return () => {};
          return room.events.self.subscribeOnce(callback);
        },
        [room]
      ),
      useCallback(() => {
        return room?.getSelf()?.canComment ?? true;
      }, [room]),
      useCallback(() => true, [])
    );

    const permissions = useRoomPermissions(roomId);
    const canComment =
      permissions.size > 0
        ? permissions.has(Permission.CommentsWrite) ||
          permissions.has(Permission.Write)
        : canCommentFallback;

    const setEmptyRef = useCallback((isEmpty: boolean) => {
      isEmptyRef.current = isEmpty;
    }, []);

    const setEmojiPickerOpenRef = useCallback((isEmojiPickerOpen: boolean) => {
      isEmojiPickerOpenRef.current = isEmojiPickerOpen;
    }, []);

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLFormElement>) => {
        onFocus?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (isEmptyRef.current && canComment) {
          onCollapsedChange?.(false);
        }
      },
      [onCollapsedChange, onFocus, canComment]
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLFormElement>) => {
        onBlur?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        const isOutside = !event.currentTarget.contains(
          event.relatedTarget ?? document.activeElement
        );

        if (isOutside && isEmptyRef.current && !isEmojiPickerOpenRef.current) {
          onCollapsedChange?.(true);
        }
      },
      [onBlur, onCollapsedChange]
    );

    const handleEditorClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();

        if (isEmptyRef.current && canComment) {
          onCollapsedChange?.(false);
        }
      },
      [onCollapsedChange, canComment]
    );

    const handleCommentSubmit = useCallback(
      (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
        onComposerSubmit?.(comment, event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (commentId && threadId) {
          editComment({
            commentId,
            threadId,
            body: comment.body,
            attachments: comment.attachments,
          });
        } else if (threadId) {
          createComment({
            threadId,
            body: comment.body,
            attachments: comment.attachments,
          });
        } else {
          createThread({
            body: comment.body,
            metadata: metadata ?? {},
            attachments: comment.attachments,
          });
        }
      },
      [
        commentId,
        createComment,
        createThread,
        editComment,
        metadata,
        onComposerSubmit,
        threadId,
      ]
    );

    return (
      <TooltipProvider>
        <ComposerPrimitive.Form
          onComposerSubmit={handleCommentSubmit}
          className={classNames(
            "lb-root lb-composer lb-composer-form",
            className
          )}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
          data-collapsed={isCollapsed ? "" : undefined}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || !canComment}
          defaultAttachments={defaultAttachments}
          pasteFilesAsAttachments={showAttachments}
          preventUnsavedChanges={preventUnsavedComposerChanges}
          roomId={roomId}
        >
          <ComposerEditorContainer
            defaultValue={defaultValue}
            actions={actions}
            overrides={overrides}
            isCollapsed={isCollapsed}
            showAttachments={showAttachments}
            showAttribution={showAttribution}
            showFormattingControls={showFormattingControls}
            hasResolveMentionSuggestions={hasResolveMentionSuggestions}
            onEmptyChange={setEmptyRef}
            onEmojiPickerOpenChange={setEmojiPickerOpenRef}
            onEditorClick={handleEditorClick}
            autoFocus={autoFocus}
            disabled={disabled}
          />
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
) as <M extends BaseMetadata = DM>(
  props: ComposerProps<M> & RefAttributes<HTMLFormElement>
) => JSX.Element;
