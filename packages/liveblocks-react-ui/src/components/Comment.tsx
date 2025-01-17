"use client";

import type {
  CommentAttachment,
  CommentData,
  CommentReaction as CommentReactionData,
} from "@liveblocks/core";
import {
  useAddRoomCommentReaction,
  useDeleteRoomComment,
  useEditRoomComment,
  useMarkRoomThreadAsRead,
  useRemoveRoomCommentReaction,
  useRoomAttachmentUrl,
} from "@liveblocks/react/_private";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  FormEvent,
  MouseEvent,
  ReactNode,
  RefObject,
  SyntheticEvent,
} from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CheckIcon } from "../icons/Check";
import { CrossIcon } from "../icons/Cross";
import { DeleteIcon } from "../icons/Delete";
import { EditIcon } from "../icons/Edit";
import { EllipsisIcon } from "../icons/Ellipsis";
import { EmojiAddIcon } from "../icons/EmojiAdd";
import type {
  CommentOverrides,
  ComposerOverrides,
  GlobalOverrides,
} from "../overrides";
import { useOverrides } from "../overrides";
import type { ComposerSubmitComment } from "../primitives";
import * as CommentPrimitive from "../primitives/Comment";
import type {
  CommentBodyLinkProps,
  CommentBodyMentionProps,
  CommentLinkProps,
  CommentMentionProps,
} from "../primitives/Comment/types";
import * as ComposerPrimitive from "../primitives/Composer";
import { Timestamp } from "../primitives/Timestamp";
import { useCurrentUserId } from "../shared";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import type { CommentAttachmentArgs } from "../types";
import { classNames } from "../utils/class-names";
import { download } from "../utils/download";
import { useRefs } from "../utils/use-refs";
import { useVisibleCallback } from "../utils/use-visible";
import { useWindowFocus } from "../utils/use-window-focus";
import type { ComposerProps } from "./Composer";
import { Composer } from "./Composer";
import {
  FileAttachment,
  MediaAttachment,
  separateMediaAttachments,
} from "./internal/Attachment";
import { Avatar } from "./internal/Avatar";
import { Button, CustomButton } from "./internal/Button";
import { Dropdown, DropdownItem, DropdownTrigger } from "./internal/Dropdown";
import { Emoji } from "./internal/Emoji";
import { EmojiPicker, EmojiPickerTrigger } from "./internal/EmojiPicker";
import { List } from "./internal/List";
import { ShortcutTooltip, Tooltip, TooltipProvider } from "./internal/Tooltip";
import { User } from "./internal/User";

const REACTIONS_TRUNCATE = 5;

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The comment to display.
   */
  comment: CommentData;

  /**
   * How to show or hide the actions.
   */
  showActions?: boolean | "hover";

  /**
   * Whether to show the comment if it was deleted. If set to `false`, it will render deleted comments as `null`.
   */
  showDeleted?: boolean;

  /**
   * Whether to show reactions.
   */
  showReactions?: boolean;

  /**
   * Whether to show attachments.
   */
  showAttachments?: boolean;

  /**
   * Whether to show the composer's formatting controls when editing the comment.
   */
  showComposerFormattingControls?: ComposerProps["showFormattingControls"];

  /**
   * Whether to indent the comment's content.
   */
  indentContent?: boolean;

  /**
   * The event handler called when the comment is edited.
   */
  onCommentEdit?: (comment: CommentData) => void;

  /**
   * The event handler called when the comment is deleted.
   */
  onCommentDelete?: (comment: CommentData) => void;

  /**
   * The event handler called when clicking on the author.
   */
  onAuthorClick?: (userId: string, event: MouseEvent<HTMLElement>) => void;

  /**
   * The event handler called when clicking on a mention.
   */
  onMentionClick?: (userId: string, event: MouseEvent<HTMLElement>) => void;

  /**
   * The event handler called when clicking on a comment's attachment.
   */
  onAttachmentClick?: (
    args: CommentAttachmentArgs,
    event: MouseEvent<HTMLElement>
  ) => void;

  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides & CommentOverrides & ComposerOverrides>;

  /**
   * @internal
   */
  autoMarkReadThreadId?: string;

  /**
   * @internal
   */
  additionalActions?: ReactNode;

  /**
   * @internal
   */
  additionalActionsClassName?: string;
}

interface CommentReactionButtonProps
  extends ComponentPropsWithoutRef<typeof Button> {
  reaction: CommentReactionData;
  overrides?: Partial<GlobalOverrides & CommentOverrides>;
}

interface CommentReactionProps extends ComponentPropsWithoutRef<"button"> {
  comment: CommentData;
  reaction: CommentReactionData;
  overrides?: Partial<GlobalOverrides & CommentOverrides>;
}

type CommentNonInteractiveReactionProps = Omit<CommentReactionProps, "comment">;

interface CommentAttachmentProps extends ComponentProps<typeof FileAttachment> {
  attachment: CommentAttachment;
  onAttachmentClick?: CommentProps["onAttachmentClick"];
}

export function CommentMention({
  userId,
  className,
  ...props
}: CommentBodyMentionProps & CommentMentionProps) {
  const currentId = useCurrentUserId();
  return (
    <CommentPrimitive.Mention
      className={classNames("lb-comment-mention", className)}
      data-self={userId === currentId ? "" : undefined}
      {...props}
    >
      {MENTION_CHARACTER}
      <User userId={userId} />
    </CommentPrimitive.Mention>
  );
}

export function CommentLink({
  href,
  children,
  className,
  ...props
}: CommentBodyLinkProps & CommentLinkProps) {
  return (
    <CommentPrimitive.Link
      className={classNames("lb-comment-link", className)}
      href={href}
      {...props}
    >
      {children}
    </CommentPrimitive.Link>
  );
}

export function CommentNonInteractiveLink({
  href: _href,
  children,
  className,
  ...props
}: CommentBodyLinkProps & CommentLinkProps) {
  return (
    <span className={classNames("lb-comment-link", className)} {...props}>
      {children}
    </span>
  );
}

const CommentReactionButton = forwardRef<
  HTMLButtonElement,
  CommentReactionButtonProps
>(({ reaction, overrides, className, ...props }, forwardedRef) => {
  const $ = useOverrides(overrides);
  return (
    <CustomButton
      className={classNames("lb-comment-reaction", className)}
      variant="outline"
      aria-label={$.COMMENT_REACTION_DESCRIPTION(
        reaction.emoji,
        reaction.users.length
      )}
      {...props}
      ref={forwardedRef}
    >
      <Emoji className="lb-comment-reaction-emoji" emoji={reaction.emoji} />
      <span className="lb-comment-reaction-count">{reaction.users.length}</span>
    </CustomButton>
  );
});

export const CommentReaction = forwardRef<
  HTMLButtonElement,
  CommentReactionProps
>(({ comment, reaction, overrides, disabled, ...props }, forwardedRef) => {
  const addReaction = useAddRoomCommentReaction(comment.roomId);
  const removeReaction = useRemoveRoomCommentReaction(comment.roomId);
  const currentId = useCurrentUserId();
  const isActive = useMemo(() => {
    return reaction.users.some((users) => users.id === currentId);
  }, [currentId, reaction]);
  const $ = useOverrides(overrides);
  const tooltipContent = useMemo(
    () => (
      <span>
        {$.COMMENT_REACTION_LIST(
          <List
            values={reaction.users.map((users) => (
              <User key={users.id} userId={users.id} replaceSelf />
            ))}
            formatRemaining={$.LIST_REMAINING_USERS}
            truncate={REACTIONS_TRUNCATE}
            locale={$.locale}
          />,
          reaction.emoji,
          reaction.users.length
        )}
      </span>
    ),
    [$, reaction]
  );

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const handlePressedChange = useCallback(
    (isPressed: boolean) => {
      if (isPressed) {
        addReaction({
          threadId: comment.threadId,
          commentId: comment.id,
          emoji: reaction.emoji,
        });
      } else {
        removeReaction({
          threadId: comment.threadId,
          commentId: comment.id,
          emoji: reaction.emoji,
        });
      }
    },
    [addReaction, comment.threadId, comment.id, reaction.emoji, removeReaction]
  );

  return (
    <Tooltip
      content={tooltipContent}
      multiline
      className="lb-comment-reaction-tooltip"
    >
      <TogglePrimitive.Root
        asChild
        pressed={isActive}
        onPressedChange={handlePressedChange}
        onClick={stopPropagation}
        disabled={disabled}
        ref={forwardedRef}
      >
        <CommentReactionButton
          data-self={isActive ? "" : undefined}
          reaction={reaction}
          overrides={overrides}
          {...props}
        />
      </TogglePrimitive.Root>
    </Tooltip>
  );
});

export const CommentNonInteractiveReaction = forwardRef<
  HTMLButtonElement,
  CommentNonInteractiveReactionProps
>(({ reaction, overrides, ...props }, forwardedRef) => {
  const currentId = useCurrentUserId();
  const isActive = useMemo(() => {
    return reaction.users.some((users) => users.id === currentId);
  }, [currentId, reaction]);

  return (
    <CommentReactionButton
      disableable={false}
      data-self={isActive ? "" : undefined}
      reaction={reaction}
      overrides={overrides}
      {...props}
      ref={forwardedRef}
    />
  );
});

function openAttachment({ attachment, url }: CommentAttachmentArgs) {
  // Open the attachment in a new tab if the attachment is a PDF,
  // an image, a video, or audio. Otherwise, download it.
  if (
    attachment.mimeType === "application/pdf" ||
    attachment.mimeType.startsWith("image/") ||
    attachment.mimeType.startsWith("video/") ||
    attachment.mimeType.startsWith("audio/")
  ) {
    window.open(url, "_blank");
  } else {
    download(url, attachment.name);
  }
}

function CommentMediaAttachment({
  attachment,
  onAttachmentClick,
  roomId,
  className,
  overrides,
  ...props
}: CommentAttachmentProps & {
  roomId: string;
}) {
  const { url } = useRoomAttachmentUrl(attachment.id, roomId);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!url) {
        return;
      }

      const args: CommentAttachmentArgs = { attachment, url };

      onAttachmentClick?.(args, event);

      if (event.isDefaultPrevented()) {
        return;
      }

      openAttachment(args);
    },
    [attachment, onAttachmentClick, url]
  );

  return (
    <MediaAttachment
      className={classNames("lb-comment-attachment", className)}
      {...props}
      attachment={attachment}
      overrides={overrides}
      onClick={url ? handleClick : undefined}
      roomId={roomId}
    />
  );
}

function CommentFileAttachment({
  attachment,
  onAttachmentClick,
  roomId,
  className,
  overrides,
  ...props
}: CommentAttachmentProps & {
  roomId: string;
}) {
  const { url } = useRoomAttachmentUrl(attachment.id, roomId);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!url) {
        return;
      }

      const args: CommentAttachmentArgs = { attachment, url };

      onAttachmentClick?.(args, event);

      if (event.isDefaultPrevented()) {
        return;
      }

      openAttachment(args);
    },
    [attachment, onAttachmentClick, url]
  );

  return (
    <FileAttachment
      className={classNames("lb-comment-attachment", className)}
      {...props}
      attachment={attachment}
      overrides={overrides}
      onClick={url ? handleClick : undefined}
      roomId={roomId}
    />
  );
}

export function CommentNonInteractiveFileAttachment({
  className,
  ...props
}: CommentAttachmentProps) {
  return (
    <FileAttachment
      className={classNames("lb-comment-attachment", className)}
      allowMediaPreview={false}
      {...props}
    />
  );
}

// A void component (which doesn't render anything) responsible for marking a thread
// as read when the comment it's used in becomes visible.
// Moving this logic into a separate component allows us to use the visibility
// and focus hooks "conditionally" by conditionally rendering this component.
function AutoMarkReadThreadIdHandler({
  threadId,
  roomId,
  commentRef,
}: {
  threadId: string;
  roomId: string;
  commentRef: RefObject<HTMLElement>;
}) {
  const markThreadAsRead = useMarkRoomThreadAsRead(roomId);
  const isWindowFocused = useWindowFocus();

  useVisibleCallback(
    commentRef,
    () => {
      markThreadAsRead(threadId);
    },
    {
      // The underlying IntersectionObserver is only enabled when the window is focused
      enabled: isWindowFocused,
    }
  );

  return null;
}

/**
 * Displays a single comment.
 *
 * @example
 * <>
 *   {thread.comments.map((comment) => (
 *     <Comment key={comment.id} comment={comment} />
 *   ))}
 * </>
 */
export const Comment = forwardRef<HTMLDivElement, CommentProps>(
  (
    {
      comment,
      indentContent = true,
      showDeleted,
      showActions = "hover",
      showReactions = true,
      showAttachments = true,
      showComposerFormattingControls = true,
      onAuthorClick,
      onMentionClick,
      onAttachmentClick,
      onCommentEdit,
      onCommentDelete,
      overrides,
      className,
      additionalActions,
      additionalActionsClassName,
      autoMarkReadThreadId,
      ...props
    },
    forwardedRef
  ) => {
    const ref = useRef<HTMLDivElement>(null);
    const mergedRefs = useRefs(forwardedRef, ref);
    const currentUserId = useCurrentUserId();
    const deleteComment = useDeleteRoomComment(comment.roomId);
    const editComment = useEditRoomComment(comment.roomId);
    const addReaction = useAddRoomCommentReaction(comment.roomId);
    const removeReaction = useRemoveRoomCommentReaction(comment.roomId);
    const $ = useOverrides(overrides);
    const [isEditing, setEditing] = useState(false);
    const [isTarget, setTarget] = useState(false);
    const [isMoreActionOpen, setMoreActionOpen] = useState(false);
    const [isReactionActionOpen, setReactionActionOpen] = useState(false);
    const { mediaAttachments, fileAttachments } = useMemo(() => {
      return separateMediaAttachments(comment.attachments);
    }, [comment.attachments]);

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const handleEdit = useCallback(() => {
      setEditing(true);
    }, []);

    const handleEditCancel = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setEditing(false);
      },
      []
    );

    const handleEditSubmit = useCallback(
      (
        { body, attachments }: ComposerSubmitComment,
        event: FormEvent<HTMLFormElement>
      ) => {
        // TODO: Add a way to preventDefault from within this callback, to override the default behavior (e.g. showing a confirmation dialog)
        onCommentEdit?.(comment);

        event.preventDefault();
        setEditing(false);
        editComment({
          commentId: comment.id,
          threadId: comment.threadId,
          body,
          attachments,
        });
      },
      [comment, editComment, onCommentEdit]
    );

    const handleDelete = useCallback(() => {
      // TODO: Add a way to preventDefault from within this callback, to override the default behavior (e.g. showing a confirmation dialog)
      onCommentDelete?.(comment);

      deleteComment({
        commentId: comment.id,
        threadId: comment.threadId,
      });
    }, [comment, deleteComment, onCommentDelete]);

    const handleAuthorClick = useCallback(
      (event: MouseEvent<HTMLElement>) => {
        onAuthorClick?.(comment.userId, event);
      },
      [comment.userId, onAuthorClick]
    );

    const handleReactionSelect = useCallback(
      (emoji: string) => {
        const reactionIndex = comment.reactions.findIndex(
          (reaction) => reaction.emoji === emoji
        );

        if (
          reactionIndex >= 0 &&
          currentUserId &&
          comment.reactions[reactionIndex]?.users.some(
            (user) => user.id === currentUserId
          )
        ) {
          removeReaction({
            threadId: comment.threadId,
            commentId: comment.id,
            emoji,
          });
        } else {
          addReaction({
            threadId: comment.threadId,
            commentId: comment.id,
            emoji,
          });
        }
      },
      [
        addReaction,
        comment.id,
        comment.reactions,
        comment.threadId,
        removeReaction,
        currentUserId,
      ]
    );

    useEffect(() => {
      const isWindowDefined = typeof window !== "undefined";
      if (!isWindowDefined) return;

      const hash = window.location.hash;
      const commentId = hash.slice(1);

      if (commentId === comment.id) {
        setTarget(true);
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!showDeleted && !comment.body) {
      return null;
    }

    return (
      <TooltipProvider>
        {autoMarkReadThreadId && (
          <AutoMarkReadThreadIdHandler
            commentRef={ref}
            threadId={autoMarkReadThreadId}
            roomId={comment.roomId}
          />
        )}
        <div
          id={comment.id}
          className={classNames(
            "lb-root lb-comment",
            indentContent && "lb-comment:indent-content",
            showActions === "hover" && "lb-comment:show-actions-hover",
            (isMoreActionOpen || isReactionActionOpen) &&
              "lb-comment:action-open",
            className
          )}
          data-deleted={!comment.body ? "" : undefined}
          data-editing={isEditing ? "" : undefined}
          // In some cases, `:target` doesn't work as expected so we also define it manually.
          data-target={isTarget ? "" : undefined}
          dir={$.dir}
          {...props}
          ref={mergedRefs}
        >
          <div className="lb-comment-header">
            <div className="lb-comment-details">
              <Avatar
                className="lb-comment-avatar"
                userId={comment.userId}
                onClick={handleAuthorClick}
              />
              <span className="lb-comment-details-labels">
                <User
                  className="lb-comment-author"
                  userId={comment.userId}
                  onClick={handleAuthorClick}
                />
                <span className="lb-comment-date">
                  <Timestamp
                    locale={$.locale}
                    date={comment.createdAt}
                    className="lb-date lb-comment-date-created"
                  />
                  {comment.editedAt && comment.body && (
                    <>
                      {" "}
                      <span className="lb-comment-date-edited">
                        {$.COMMENT_EDITED}
                      </span>
                    </>
                  )}
                </span>
              </span>
            </div>
            {showActions && !isEditing && (
              <div
                className={classNames(
                  "lb-comment-actions",
                  additionalActionsClassName
                )}
              >
                {additionalActions ?? null}
                {showReactions && (
                  <EmojiPicker
                    onEmojiSelect={handleReactionSelect}
                    onOpenChange={setReactionActionOpen}
                  >
                    <Tooltip content={$.COMMENT_ADD_REACTION}>
                      <EmojiPickerTrigger asChild>
                        <Button
                          className="lb-comment-action"
                          onClick={stopPropagation}
                          aria-label={$.COMMENT_ADD_REACTION}
                          icon={<EmojiAddIcon />}
                        />
                      </EmojiPickerTrigger>
                    </Tooltip>
                  </EmojiPicker>
                )}
                {comment.userId === currentUserId && (
                  <Dropdown
                    open={isMoreActionOpen}
                    onOpenChange={setMoreActionOpen}
                    align="end"
                    content={
                      <>
                        <DropdownItem
                          onSelect={handleEdit}
                          onClick={stopPropagation}
                          icon={<EditIcon />}
                        >
                          {$.COMMENT_EDIT}
                        </DropdownItem>
                        <DropdownItem
                          onSelect={handleDelete}
                          onClick={stopPropagation}
                          icon={<DeleteIcon />}
                        >
                          {$.COMMENT_DELETE}
                        </DropdownItem>
                      </>
                    }
                  >
                    <Tooltip content={$.COMMENT_MORE}>
                      <DropdownTrigger asChild>
                        <Button
                          className="lb-comment-action"
                          disabled={!comment.body}
                          onClick={stopPropagation}
                          aria-label={$.COMMENT_MORE}
                          icon={<EllipsisIcon />}
                        />
                      </DropdownTrigger>
                    </Tooltip>
                  </Dropdown>
                )}
              </div>
            )}
          </div>
          <div className="lb-comment-content">
            {isEditing ? (
              <Composer
                className="lb-comment-composer"
                onComposerSubmit={handleEditSubmit}
                defaultValue={comment.body}
                defaultAttachments={comment.attachments}
                autoFocus
                showAttribution={false}
                showAttachments={showAttachments}
                showFormattingControls={showComposerFormattingControls}
                actions={
                  <>
                    <Tooltip
                      content={$.COMMENT_EDIT_COMPOSER_CANCEL}
                      aria-label={$.COMMENT_EDIT_COMPOSER_CANCEL}
                    >
                      <Button
                        className="lb-composer-action"
                        onClick={handleEditCancel}
                        icon={<CrossIcon />}
                      />
                    </Tooltip>
                    <ShortcutTooltip
                      content={$.COMMENT_EDIT_COMPOSER_SAVE}
                      shortcut="Enter"
                    >
                      <ComposerPrimitive.Submit asChild>
                        <Button
                          variant="primary"
                          className="lb-composer-action"
                          onClick={stopPropagation}
                          aria-label={$.COMMENT_EDIT_COMPOSER_SAVE}
                          icon={<CheckIcon />}
                        />
                      </ComposerPrimitive.Submit>
                    </ShortcutTooltip>
                  </>
                }
                overrides={{
                  COMPOSER_PLACEHOLDER: $.COMMENT_EDIT_COMPOSER_PLACEHOLDER,
                }}
                roomId={comment.roomId}
              />
            ) : comment.body ? (
              <>
                <CommentPrimitive.Body
                  className="lb-comment-body"
                  body={comment.body}
                  components={{
                    Mention: ({ userId }) => (
                      <CommentMention
                        userId={userId}
                        onClick={(event) => onMentionClick?.(userId, event)}
                      />
                    ),
                    Link: CommentLink,
                  }}
                />
                {showAttachments &&
                (mediaAttachments.length > 0 || fileAttachments.length > 0) ? (
                  <div className="lb-comment-attachments">
                    {mediaAttachments.length > 0 ? (
                      <div className="lb-attachments">
                        {mediaAttachments.map((attachment) => (
                          <CommentMediaAttachment
                            key={attachment.id}
                            attachment={attachment}
                            overrides={overrides}
                            onAttachmentClick={onAttachmentClick}
                            roomId={comment.roomId}
                          />
                        ))}
                      </div>
                    ) : null}
                    {fileAttachments.length > 0 ? (
                      <div className="lb-attachments">
                        {fileAttachments.map((attachment) => (
                          <CommentFileAttachment
                            key={attachment.id}
                            attachment={attachment}
                            overrides={overrides}
                            onAttachmentClick={onAttachmentClick}
                            roomId={comment.roomId}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {showReactions && comment.reactions.length > 0 && (
                  <div className="lb-comment-reactions">
                    {comment.reactions.map((reaction) => (
                      <CommentReaction
                        key={reaction.emoji}
                        comment={comment}
                        reaction={reaction}
                        overrides={overrides}
                      />
                    ))}
                    <EmojiPicker onEmojiSelect={handleReactionSelect}>
                      <Tooltip content={$.COMMENT_ADD_REACTION}>
                        <EmojiPickerTrigger asChild>
                          <Button
                            className="lb-comment-reaction lb-comment-reaction-add"
                            variant="outline"
                            onClick={stopPropagation}
                            aria-label={$.COMMENT_ADD_REACTION}
                            icon={<EmojiAddIcon />}
                          />
                        </EmojiPickerTrigger>
                      </Tooltip>
                    </EmojiPicker>
                  </div>
                )}
              </>
            ) : (
              <div className="lb-comment-body">
                <p className="lb-comment-deleted">{$.COMMENT_DELETED}</p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }
);
