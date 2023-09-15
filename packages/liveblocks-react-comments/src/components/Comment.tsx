"use client";

import type { CommentData } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import type {
  ComponentPropsWithoutRef,
  FormEvent,
  MouseEvent,
  ReactNode,
  SyntheticEvent,
} from "react";
import React, { forwardRef, useCallback, useState } from "react";

import { CheckIcon } from "../icons/check";
import { CrossIcon } from "../icons/cross";
import { DeleteIcon } from "../icons/delete";
import { EditIcon } from "../icons/edit";
import { EllipsisIcon } from "../icons/ellipsis";
import {
  type CommentOverrides,
  type ComposerOverrides,
  useOverrides,
} from "../overrides";
import type { ComposerSubmitComment } from "../primitives";
import * as CommentPrimitive from "../primitives/Comment";
import type {
  CommentLinkProps,
  CommentMentionProps,
  CommentRenderLinkProps,
  CommentRenderMentionProps,
} from "../primitives/Comment/types";
import * as ComposerPrimitive from "../primitives/Composer";
import { Timestamp } from "../primitives/Timestamp";
import { MENTION_CHARACTER } from "../slate/plugins/mentions";
import { classNames } from "../utils/class-names";
import { Composer } from "./Composer";
import { Avatar } from "./internal/Avatar";
import { Button } from "./internal/Button";
import { Dropdown, DropdownItem, DropdownTrigger } from "./internal/Dropdown";
import {
  Tooltip,
  TooltipProvider,
  TooltipShortcutKey,
} from "./internal/Tooltip";
import { User } from "./internal/User";

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
   * Whether to indent the comment's body.
   */
  indentBody?: boolean;

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

function CommentMention({
  userId,
  className,
  ...props
}: CommentRenderMentionProps & CommentMentionProps) {
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
}: CommentRenderLinkProps & CommentLinkProps) {
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
      indentBody = true,
      showDeleted,
      showActions = "hover",
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
    const { useDeleteComment, useEditComment, useSelf } =
      useRoomContextBundle();
    const self = useSelf();
    const deleteComment = useDeleteComment();
    const editComment = useEditComment();
    const $ = useOverrides(overrides);
    const [isEditing, setEditing] = useState(false);
    const [isMoreOpen, setMoreOpen] = useState(false);

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

    if (!showDeleted && !comment.body) {
      return null;
    }

    return (
      <TooltipProvider>
        <div
          className={classNames(
            "lb-root lb-comment",
            indentBody && "lb-comment:indent-body",
            showActions === "hover" && "lb-comment:show-actions-hover",
            isMoreOpen && "lb-comment:dropdown-open",
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
                {comment.userId === self?.id && (
                  <Dropdown
                    open={isMoreOpen}
                    onOpenChange={setMoreOpen}
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
                      type="button"
                      className="lb-composer-action"
                      onClick={handleEditCancel}
                    >
                      <CrossIcon className="lb-button-icon" />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content={$.COMMENT_EDIT_COMPOSER_SAVE}
                    shortcut={<TooltipShortcutKey name="enter" />}
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
                  </Tooltip>
                </>
              }
              overrides={{
                COMPOSER_PLACEHOLDER: $.COMMENT_EDIT_COMPOSER_PLACEHOLDER,
              }}
            />
          ) : comment.body ? (
            <CommentPrimitive.Body
              className="lb-comment-body"
              body={comment.body}
              renderMention={({ userId }) => (
                <CommentMention
                  userId={userId}
                  onClick={(event) => onMentionClick?.(userId, event)}
                />
              )}
              renderLink={CommentLink}
            />
          ) : (
            <div className="lb-comment-body">
              <p className="lb-comment-deleted">{$.COMMENT_DELETED}</p>
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }
);
