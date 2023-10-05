"use client";

import type {
  CommentData,
  CommentReaction as CommentReactionData,
} from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import type {
  ComponentPropsWithoutRef,
  FormEvent,
  MouseEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import { CheckIcon } from "../icons/Check";
import { CrossIcon } from "../icons/Cross";
import { DeleteIcon } from "../icons/Delete";
import { EditIcon } from "../icons/Edit";
import { EllipsisIcon } from "../icons/Ellipsis";
import { EmojiAddIcon } from "../icons/EmojiAdd";
import {
  type CommentOverrides,
  type ComposerOverrides,
  useOverrides,
} from "../overrides";
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
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import { classNames } from "../utils/class-names";
import { Composer } from "./Composer";
import { Avatar } from "./internal/Avatar";
import { Button } from "./internal/Button";
import { Dropdown, DropdownItem, DropdownTrigger } from "./internal/Dropdown";
import { Emoji } from "./internal/Emoji";
import { EmojiPicker, EmojiPickerTrigger } from "./internal/EmojiPicker";
import { List } from "./internal/List";
import {
  ShortcutTooltip,
  ShortcutTooltipKey,
  Tooltip,
  TooltipProvider,
} from "./internal/Tooltip";
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
   * Whether to indent the comment's content.
   */
  indentContent?: boolean;

  /**
   * The event handler called when the comment is edited.
   */
  onEdit?: (comment: CommentData) => void;

  /**
   * The event handler called when the comment is deleted.
   */
  onDelete?: (comment: CommentData) => void;

  /**
   * The event handler called when clicking on the author.
   */
  onAuthorClick?: (userId: string, event: MouseEvent<HTMLElement>) => void;

  /**
   * The event handler called when clicking on a mention.
   */
  onMentionClick?: (userId: string, event: MouseEvent<HTMLElement>) => void;

  /**
   * Override the component's strings.
   */
  overrides?: Partial<CommentOverrides & ComposerOverrides>;

  /**
   * @internal
   */
  additionalActions?: ReactNode;

  /**
   * @internal
   */
  additionalActionsClassName?: string;
}

interface CommentReactionProps extends ComponentPropsWithoutRef<"button"> {
  comment: CommentData;
  reaction: CommentReactionData;
}

function CommentMention({
  userId,
  className,
  ...props
}: CommentBodyMentionProps & CommentMentionProps) {
  const { useSelf } = useRoomContextBundle();
  const self = useSelf();

  return (
    <CommentPrimitive.Mention
      className={classNames("lb-comment-mention", className)}
      data-self={userId === self?.id ? "" : undefined}
      {...props}
    >
      {MENTION_CHARACTER}
      <User userId={userId} />
    </CommentPrimitive.Mention>
  );
}

function CommentLink({
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

const CommentReaction = forwardRef<HTMLButtonElement, CommentReactionProps>(
  ({ comment, reaction, className, ...props }, forwardedRef) => {
    const { useAddReaction, useRemoveReaction, useSelf } =
      useRoomContextBundle();
    const self = useSelf();
    const addReaction = useAddReaction();
    const removeReaction = useRemoveReaction();
    const isActive = useMemo(() => {
      return reaction.users.some((users) => users.id === self?.id);
    }, [reaction, self?.id]);
    const $ = useOverrides();
    const tooltipContent = useMemo(
      () => (
        <span>
          {$.COMMENT_REACTION_TOOLTIP(
            reaction.emoji,
            <List
              values={reaction.users.map((users, index) => (
                <User
                  key={users.id}
                  userId={users.id}
                  capitalize={index === 0}
                  replaceSelf
                />
              ))}
              formatRemaining={$.COMMENT_REACTION_REMAINING}
              truncate={REACTIONS_TRUNCATE}
            />,
            reaction.users.length
          )}
        </span>
      ),
      [$, reaction]
    );

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
      [
        addReaction,
        comment.threadId,
        comment.id,
        reaction.emoji,
        removeReaction,
      ]
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
          ref={forwardedRef}
        >
          <Button
            className={classNames("lb-comment-reaction", className)}
            variant="outline"
            aria-label={$.COMMENT_REACTION_DESCRIPTION(
              reaction.emoji,
              reaction.users.length
            )}
            data-self={isActive ? "" : undefined}
            {...props}
          >
            <Emoji
              className="lb-comment-reaction-emoji"
              emoji={reaction.emoji}
            />
            <span className="lb-comment-reaction-count">
              {reaction.users.length}
            </span>
          </Button>
        </TogglePrimitive.Root>
      </Tooltip>
    );
  }
);

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
      onAuthorClick,
      onMentionClick,
      onEdit,
      onDelete,
      overrides,
      additionalActions,
      additionalActionsClassName,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const {
      useDeleteComment,
      useEditComment,
      useAddReaction,
      useRemoveReaction,
      useSelf,
    } = useRoomContextBundle();
    const self = useSelf();
    const deleteComment = useDeleteComment();
    const editComment = useEditComment();
    const addReaction = useAddReaction();
    const removeReaction = useRemoveReaction();
    const $ = useOverrides(overrides);
    const [isEditing, setEditing] = useState(false);
    const [isMoreActionOpen, setMoreActionOpen] = useState(false);
    const [isReactionActionOpen, setReactionActionOpen] = useState(false);

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
      ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
        // TODO: Add a way to preventDefault from within this callback, to override the default behavior (e.g. showing a confirmation dialog)
        onEdit?.(comment);

        event.preventDefault();
        setEditing(false);
        editComment({
          commentId: comment.id,
          threadId: comment.threadId,
          body,
        });
      },
      [comment, editComment, onEdit]
    );

    const handleDelete = useCallback(() => {
      // TODO: Add a way to preventDefault from within this callback, to override the default behavior (e.g. showing a confirmation dialog)
      onDelete?.(comment);

      deleteComment({
        commentId: comment.id,
        threadId: comment.threadId,
      });
    }, [comment, deleteComment, onDelete]);

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
          reactionIndex > 0 &&
          self?.id &&
          comment.reactions[reactionIndex].users.some(
            (user) => user.id === self?.id
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
        self?.id,
      ]
    );

    if (!showDeleted && !comment.body) {
      return null;
    }

    return (
      <TooltipProvider>
        <div
          className={classNames(
            "lb-root lb-comment",
            indentContent && "lb-comment:indent-content",
            showActions === "hover" && "lb-comment:show-actions-hover",
            (isMoreActionOpen || isReactionActionOpen) &&
              "lb-comment:action-open",
            className
          )}
          data-deleted={!comment.body ? "" : undefined}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
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
                    className="lb-comment-date-timestamp"
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
                        >
                          <EmojiAddIcon className="lb-button-icon" />
                        </Button>
                      </EmojiPickerTrigger>
                    </Tooltip>
                  </EmojiPicker>
                )}
                {comment.userId === self?.id && (
                  <Dropdown
                    open={isMoreActionOpen}
                    onOpenChange={setMoreActionOpen}
                    align="end"
                    content={
                      <>
                        <DropdownItem
                          onSelect={handleEdit}
                          onClick={stopPropagation}
                        >
                          <EditIcon className="lb-dropdown-item-icon" />
                          {$.COMMENT_EDIT}
                        </DropdownItem>
                        <DropdownItem
                          onSelect={handleDelete}
                          onClick={stopPropagation}
                        >
                          <DeleteIcon className="lb-dropdown-item-icon" />
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
                        >
                          <EllipsisIcon className="lb-button-icon" />
                        </Button>
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
                placeholder={$.COMMENT_EDIT_COMPOSER_PLACEHOLDER}
                autoFocus
                showAttribution={false}
                actions={
                  <>
                    <Tooltip
                      content={$.COMMENT_EDIT_COMPOSER_CANCEL}
                      aria-label={$.COMMENT_EDIT_COMPOSER_CANCEL}
                    >
                      <Button
                        className="lb-composer-action"
                        onClick={handleEditCancel}
                      >
                        <CrossIcon className="lb-button-icon" />
                      </Button>
                    </Tooltip>
                    <ShortcutTooltip
                      content={$.COMMENT_EDIT_COMPOSER_SAVE}
                      shortcut={<ShortcutTooltipKey name="enter" />}
                    >
                      <ComposerPrimitive.Submit asChild>
                        <Button
                          variant="primary"
                          className="lb-composer-action"
                          onClick={stopPropagation}
                          aria-label={$.COMMENT_EDIT_COMPOSER_SAVE}
                        >
                          <CheckIcon className="lb-button-icon" />
                        </Button>
                      </ComposerPrimitive.Submit>
                    </ShortcutTooltip>
                  </>
                }
                overrides={{
                  COMPOSER_PLACEHOLDER: $.COMMENT_EDIT_COMPOSER_PLACEHOLDER,
                }}
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
                {showReactions && comment.reactions.length > 0 && (
                  <div className="lb-comment-reactions">
                    {comment.reactions.map((reaction) => (
                      <CommentReaction
                        key={reaction.emoji}
                        comment={comment}
                        reaction={reaction}
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
                          >
                            <EmojiAddIcon className="lb-button-icon" />
                          </Button>
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
