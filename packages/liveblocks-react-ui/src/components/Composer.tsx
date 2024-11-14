"use client";

import type {
  BaseMetadata,
  CommentAttachment,
  CommentMixedAttachment,
  DM,
} from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import {
  useClient,
  useCreateComment,
  useCreateThread,
  useEditComment,
} from "@liveblocks/react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  FocusEvent,
  FormEvent,
  ForwardedRef,
  MouseEvent,
  PointerEvent,
  PropsWithChildren,
  ReactNode,
  RefAttributes,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback, useMemo, useRef } from "react";

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
} from "../primitives/Composer/contexts";
import type {
  ComposerEditorComponents,
  ComposerEditorLinkProps,
  ComposerEditorMentionProps,
  ComposerEditorMentionSuggestionsProps,
  ComposerEditorProps,
  ComposerFormProps,
  ComposerSubmitComment,
} from "../primitives/Composer/types";
import { useComposerAttachmentsDropArea } from "../primitives/Composer/utils";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import type { ComposerBodyTextFormat } from "../types";
import { classNames } from "../utils/class-names";
import { useControllableState } from "../utils/use-controllable-state";
import { useLayoutEffect } from "../utils/use-layout-effect";
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

interface TextFormatToggleProps extends TogglePrimitive.ToggleProps {
  format: ComposerBodyTextFormat;
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
  };

interface ComposerEditorContainerProps
  extends Pick<
    ComposerProps,
    | "defaultValue"
    | "showAttachments"
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

function TextFormatToggle({
  format,
  shortcut,
  children,
  ...props
}: TextFormatToggleProps) {
  const { textFormats, toggleTextFormat } = useComposer();
  const $ = useOverrides();
  const label = useMemo(() => {
    return $.COMPOSER_TOGGLE_TEXT_FORMAT(format);
  }, [$, format]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const wasDefaultPrevented = event.isDefaultPrevented();

      event.preventDefault();
      event.stopPropagation();

      if (!wasDefaultPrevented) {
        toggleTextFormat(format);
      }
    },
    [format, toggleTextFormat]
  );

  return (
    <ShortcutTooltip
      content={label}
      shortcut={shortcut}
      sideOffset={FLOATING_ELEMENT_SIDE_OFFSET + 2}
    >
      <TogglePrimitive.Root asChild pressed={textFormats[format]} {...props}>
        <Button
          aria-label={label}
          active={textFormats[format]}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
        >
          {children}
        </Button>
      </TogglePrimitive.Root>
    </ShortcutTooltip>
  );
}

type TextFormatToggles = {
  [K in ComposerBodyTextFormat]: ComponentType<PropsWithChildren>;
};

const textFormatToggles: TextFormatToggles = {
  bold: () => (
    <TextFormatToggle
      format="bold"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <span>B</span>
        </>
      }
    >
      <BoldIcon />
    </TextFormatToggle>
  ),
  italic: () => (
    <TextFormatToggle
      format="italic"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <span>I</span>
        </>
      }
    >
      <ItalicIcon />
    </TextFormatToggle>
  ),
  strikethrough: () => (
    <TextFormatToggle
      format="strikethrough"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <ShortcutTooltipKey name="shift" />
          <span>S</span>
        </>
      }
    >
      <StrikethroughIcon />
    </TextFormatToggle>
  ),
  code: () => (
    <TextFormatToggle
      format="code"
      shortcut={
        <>
          <ShortcutTooltipKey name="mod" />
          <span>E</span>
        </>
      }
    >
      <CodeIcon />
    </TextFormatToggle>
  ),
};

const textFormatTogglesList = Object.entries(textFormatToggles).map(
  ([format, Toggle]) => <Toggle key={format} />
);

function ComposerFloatingToolbar() {
  return (
    <ComposerPrimitive.FloatingToolbar className="lb-root lb-portal lb-elevation lb-composer-floating-toolbar">
      {textFormatTogglesList}
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

const editorComponents: ComposerEditorComponents = {
  Mention: ComposerMention,
  MentionSuggestions: ComposerMentionSuggestions,
  FloatingToolbar: ComposerFloatingToolbar,
  Link: ComposerLink,
};

function ComposerEditorContainer({
  showAttachments = true,
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
        components={editorComponents}
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
      showAttribution,
      ...props
    }: ComposerProps<M>,
    forwardedRef: ForwardedRef<HTMLFormElement>
  ) => {
    const client = useClient();
    const createThread = useCreateThread();
    const createComment = useCreateComment();
    const editComment = useEditComment();
    const hasResolveMentionSuggestions =
      client[kInternal].resolveMentionSuggestions !== undefined;
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

        if (isEmptyRef.current) {
          onCollapsedChange?.(false);
        }
      },
      [onCollapsedChange, onFocus]
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

        if (isEmptyRef.current) {
          onCollapsedChange?.(false);
        }
      },
      [onCollapsedChange]
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
          disabled={disabled}
          defaultAttachments={defaultAttachments}
          pasteFilesAsAttachments={showAttachments}
        >
          <ComposerEditorContainer
            defaultValue={defaultValue}
            actions={actions}
            overrides={overrides}
            isCollapsed={isCollapsed}
            showAttachments={showAttachments}
            showAttribution={showAttribution}
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
