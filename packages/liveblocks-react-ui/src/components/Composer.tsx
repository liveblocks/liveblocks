"use client";

import type { BaseMetadata, DM } from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import {
  useClient,
  useCreateComment,
  useCreateThread,
  useEditComment,
  useSelf,
} from "@liveblocks/react";
import type {
  ComponentPropsWithoutRef,
  DragEvent,
  FocusEvent,
  FormEvent,
  ForwardedRef,
  MouseEvent,
  ReactNode,
  RefAttributes,
  SyntheticEvent,
} from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AttachmentIcon } from "../icons/Attachment";
import { EmojiIcon } from "../icons/Emoji";
import { MentionIcon } from "../icons/Mention";
import { SendIcon } from "../icons/Send";
import type { ComposerOverrides, GlobalOverrides } from "../overrides";
import { useOverrides } from "../overrides";
import * as ComposerPrimitive from "../primitives/Composer";
import { useComposer } from "../primitives/Composer/contexts";
import type {
  ComposerEditorComponents,
  ComposerEditorLinkProps,
  ComposerEditorMentionProps,
  ComposerEditorMentionSuggestionsProps,
  ComposerEditorProps,
  ComposerSubmitComment,
} from "../primitives/Composer/types";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import { classNames } from "../utils/class-names";
import { useControllableState } from "../utils/use-controllable-state";
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
}

interface EmojiEditorActionProps extends EditorActionProps {
  onPickerOpenChange?: EmojiPickerProps["onOpenChange"];
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
    disabled?: ComposerEditorProps["disabled"];

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

function ComposerInsertMentionEditorAction({
  label,
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
    <Tooltip content={label}>
      <Button
        className={classNames("lb-composer-editor-action", className)}
        onMouseDown={preventDefault}
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
  onPickerOpenChange,
  className,
  ...props
}: EmojiEditorActionProps) {
  const { insertText } = useComposer();

  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  return (
    <EmojiPicker onEmojiSelect={insertText} onOpenChange={onPickerOpenChange}>
      <Tooltip content={label}>
        <EmojiPickerTrigger asChild>
          <Button
            className={classNames("lb-composer-editor-action", className)}
            onMouseDown={preventDefault}
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

function ComposerInsertAttachmentEditorAction({
  label,
  className,
  ...props
}: EditorActionProps) {
  const preventDefault = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
  }, []);

  return (
    <Tooltip content={label}>
      <ComposerPrimitive.Attach asChild>
        <Button
          className={classNames("lb-composer-editor-action", className)}
          onMouseDown={preventDefault}
          aria-label={label}
          {...props}
        >
          <AttachmentIcon className="lb-button-icon" />
        </Button>
      </ComposerPrimitive.Attach>
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

function ComposerLink({ href, children }: ComposerEditorLinkProps) {
  return (
    <ComposerPrimitive.Link href={href} className="lb-composer-link">
      {children}
    </ComposerPrimitive.Link>
  );
}

function ComposerAttachments({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { attachments, removeAttachment } = useComposer();

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div
      className={classNames("lb-composer-attachments", className)}
      {...props}
    >
      {attachments.map((attachment) => {
        if (attachment.type === "remote") {
          return null;
        }

        return (
          <div key={attachment.id}>
            {attachment.file.name} ({attachment.file.size} -{" "}
            {attachment.file.type})
            <button onClick={() => removeAttachment(attachment.id)}>
              Delete
            </button>
          </div>
        );
      })}
    </div>
  );
}

const editorComponents: ComposerEditorComponents = {
  Mention: ComposerMention,
  MentionSuggestions: ComposerMentionSuggestions,
  Link: ComposerLink,
};

// A void component (which doesn't render anything) needed to access `isEmpty`, since
// `Composer.Form` is the root of a composer (with its context providers).
function IsEmptyHandler({
  onEmptyChange,
}: {
  onEmptyChange: (isEmpty: boolean) => void;
}) {
  const { isEmpty } = useComposer();

  useEffect(() => {
    onEmptyChange(isEmpty);
  }, [isEmpty, onEmptyChange]);

  return null;
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
      onComposerSubmit,
      defaultValue,
      disabled,
      autoFocus,
      collapsed: controlledCollapsed,
      defaultCollapsed,
      onCollapsedChange: controlledOnCollapsedChange,
      showAttachments = true,
      actions,
      overrides,
      showAttribution,
      onBlur,
      className,
      onFocus,
      onDragEnter,
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
    const self = useSelf();
    const isDisabled = useMemo(
      () => disabled || !self?.canComment,
      [disabled, self?.canComment]
    );
    const [isEmpty, setEmpty] = useState(true);
    const [isDraggingOver, setDraggingOver] = useState(false);
    const $ = useOverrides(overrides);
    const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [isCollapsed, onCollapsedChange] = useControllableState(
      // If the composer is neither controlled nor uncontrolled, it defaults to controlled as uncollapsed.
      controlledCollapsed === undefined && defaultCollapsed === undefined
        ? false
        : controlledCollapsed,
      controlledOnCollapsedChange,
      defaultCollapsed
    );

    const preventDefault = useCallback((event: SyntheticEvent) => {
      event.preventDefault();
    }, []);

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const handleEditorClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();

        if (isEmpty) {
          onCollapsedChange?.(false);
        }
      },
      [isEmpty, onCollapsedChange]
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLFormElement>) => {
        onFocus?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        if (isEmpty) {
          onCollapsedChange?.(false);
        }
      },
      [isEmpty, onCollapsedChange, onFocus]
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLFormElement>) => {
        onBlur?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        setDraggingOver(false);

        const isOutside = !event.currentTarget.contains(
          event.relatedTarget ?? document.activeElement
        );

        // TODO: Handle "delete" buttons on attachments (hide them when the composer is collapsed)
        if (isOutside && isEmpty && !isEmojiPickerOpen) {
          onCollapsedChange?.(true);
        }
      },
      [isEmojiPickerOpen, isEmpty, onBlur, onCollapsedChange]
    );

    const handleDragEnter = useCallback(
      (event: DragEvent<HTMLFormElement>) => {
        onDragEnter?.(event);

        if (event.isDefaultPrevented()) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setDraggingOver(true);
      },
      [onDragEnter]
    );

    const handleDropAreaDragLeave = useCallback(
      (event: DragEvent<HTMLDivElement>) => {
        if (event.isDefaultPrevented()) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setDraggingOver(false);
      },
      []
    );

    const handleDropAreaDrop = useCallback(() => {
      setDraggingOver(false);
    }, []);

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
          });
        } else if (threadId) {
          createComment({
            threadId,
            body: comment.body,
          });
        } else {
          createThread({
            body: comment.body,
            metadata: metadata ?? {},
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
          onDragEnter={handleDragEnter}
        >
          <IsEmptyHandler onEmptyChange={setEmpty} />
          <ComposerPrimitive.Editor
            className="lb-composer-editor"
            onClick={handleEditorClick}
            placeholder={$.COMPOSER_PLACEHOLDER}
            defaultValue={defaultValue}
            disabled={isDisabled}
            autoFocus={autoFocus}
            components={editorComponents}
            dir={$.dir}
          />
          {showAttachments && <ComposerAttachments />}
          {(!isCollapsed || isDraggingOver) && (
            <div className="lb-composer-footer">
              <div className="lb-composer-editor-actions">
                {hasResolveMentionSuggestions && (
                  <ComposerInsertMentionEditorAction
                    label={$.COMPOSER_INSERT_MENTION}
                    disabled={isDisabled}
                  />
                )}
                <ComposerInsertEmojiEditorAction
                  label={$.COMPOSER_INSERT_EMOJI}
                  onPickerOpenChange={setEmojiPickerOpen}
                  disabled={isDisabled}
                />
                {showAttachments && (
                  <ComposerInsertAttachmentEditorAction
                    label={$.COMPOSER_ATTACH_FILES}
                    disabled={isDisabled}
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
                      <ComposerPrimitive.Submit disabled={isDisabled} asChild>
                        <Button
                          onMouseDown={preventDefault}
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
            <ComposerPrimitive.AttachmentsDropArea
              className="lb-composer-attachments-drop-area"
              onDragLeave={handleDropAreaDragLeave}
              onDrop={handleDropAreaDrop}
            >
              <div className="lb-composer-attachments-drop-area-label">
                <AttachmentIcon />
                {$.COMPOSER_ATTACH_FILES}
              </div>
            </ComposerPrimitive.AttachmentsDropArea>
          )}
        </ComposerPrimitive.Form>
      </TooltipProvider>
    );
  }
) as <M extends BaseMetadata = DM>(
  props: ComposerProps<M> & RefAttributes<HTMLFormElement>
) => JSX.Element;
