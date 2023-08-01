"use client";

import type { CommentData } from "@liveblocks/core";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import React, { forwardRef, useCallback, useState } from "react";

import { useCommentsContext } from "../factory";
import { CheckIcon } from "../icons/check";
import { CrossIcon } from "../icons/cross";
import { DeleteIcon } from "../icons/delete";
import { EditIcon } from "../icons/edit";
import { EllipsisIcon } from "../icons/ellipsis";
import type { CommentOverrides, ComposerOverrides } from "../overrides";
import type { CommentRenderMentionProps } from "../primitives/Comment";
import { Comment as CommentPrimitive } from "../primitives/Comment";
import { Composer as ComposerPrimitive } from "../primitives/Composer";
import { Timestamp } from "../primitives/Timestamp";
import { MENTION_CHARACTER } from "../slate/mentions";
import { classNames } from "../utils/class-names";
import { Composer } from "./Composer";
import { Avatar } from "./internal/Avatar";
import { Dropdown, DropdownTrigger } from "./internal/Dropdown";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";
import { User } from "./internal/User";

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The comment to display.
   */
  comment: CommentData;

  /**
   * Whether to indent the comment body.
   */
  indentBody?: boolean;

  /**
   * When to show or hide the actions.
   */
  showActions?: boolean | "hover";

  /**
   * TODO: Add description
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

function CommentMention({ userId }: CommentRenderMentionProps) {
  return (
    <CommentPrimitive.Mention className="lb-comment-mention">
      {MENTION_CHARACTER}
      <User userId={userId} />
    </CommentPrimitive.Mention>
  );
}

export const Comment = forwardRef<HTMLDivElement, CommentProps>(
  (
    {
      comment,
      indentBody = true,
      showActions = "hover",
      overrides,
      additionalActions,
      additionalActionsClassName,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useDeleteComment, useOverrides } = useCommentsContext();
    const deleteComment = useDeleteComment();
    const $ = useOverrides(overrides);
    const [isEditing, setEditing] = useState(false);
    const [isMoreOpen, setMoreOpen] = useState(false);

    const handleEdit = useCallback(() => {
      setEditing(true);
    }, []);

    const handleEditCancel = useCallback(() => {
      setEditing(false);
    }, []);

    const handleEditSubmit = useCallback(() => {
      setEditing(false);
    }, []);

    const handleDelete = useCallback(() => {
      deleteComment({
        commentId: comment.id,
        threadId: comment.threadId,
      });
    }, [comment.id, comment.threadId, deleteComment]);

    // TODO: Add option to render a `This comment was deleted` placeholder instead
    if (!comment.body) {
      return null;
    }

    return (
      <TooltipProvider>
        <div
          className={classNames(
            "lb-root lb-comment",
            indentBody && "lb-comment:indent-body",
            showActions === "hover" && "lb-comment:show-actions-hover",
            className
          )}
          data-dropdown-open={isMoreOpen ? "" : undefined}
          dir={$.dir}
          {...props}
          ref={forwardedRef}
        >
          <div className="lb-comment-header">
            <div className="lb-comment-info">
              <Avatar className="lb-comment-avatar" userId={comment.userId} />
              <span className="lb-comment-info-labels">
                <User className="lb-comment-user" userId={comment.userId} />
                <span className="lb-comment-date">
                  <Timestamp
                    locale="en-US"
                    date={comment.createdAt}
                    className="lb-comment-date-timestamp"
                  />
                  {comment.editedAt && (
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
                <Dropdown
                  open={isMoreOpen}
                  onOpenChange={setMoreOpen}
                  align="end"
                  content={
                    <>
                      <DropdownMenu.Item
                        className="lb-dropdown-item"
                        onSelect={handleEdit}
                        disabled={!comment.body}
                      >
                        <EditIcon className="lb-dropdown-item-icon" />
                        {$.COMMENT_EDIT}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="lb-dropdown-item"
                        onSelect={handleDelete}
                        disabled={!comment.body}
                      >
                        <DeleteIcon className="lb-dropdown-item-icon" />
                        {$.COMMENT_DELETE}
                      </DropdownMenu.Item>
                    </>
                  }
                >
                  <Tooltip content={$.COMMENT_MORE}>
                    <DropdownTrigger
                      className="lb-button lb-comment-action"
                      aria-label={$.COMMENT_MORE}
                    >
                      <EllipsisIcon className="lb-button-icon" />
                    </DropdownTrigger>
                  </Tooltip>
                </Dropdown>
              </div>
            )}
          </div>
          {isEditing ? (
            <Composer
              className="lb-comment-composer"
              onCommentSubmit={handleEditSubmit}
              initialValue={comment.body}
              placeholder={$.COMMENT_EDIT_COMPOSER_PLACEHOLDER}
              autoFocus
              showLogo={false}
              actions={
                <>
                  <Tooltip
                    content={$.COMMENT_EDIT_COMPOSER_CANCEL}
                    aria-label={$.COMMENT_EDIT_COMPOSER_CANCEL}
                  >
                    <button
                      type="button"
                      className="lb-button lb-composer-action"
                      onClick={handleEditCancel}
                    >
                      <CrossIcon className="lb-button-icon" />
                    </button>
                  </Tooltip>
                  <Tooltip
                    content={$.COMMENT_EDIT_COMPOSER_SAVE}
                    shortcut={<kbd>↵</kbd>}
                  >
                    <ComposerPrimitive.Submit
                      className="lb-button lb-button:primary lb-composer-action"
                      aria-label={$.COMMENT_EDIT_COMPOSER_SAVE}
                    >
                      <CheckIcon className="lb-button-icon" />
                    </ComposerPrimitive.Submit>
                  </Tooltip>
                </>
              }
              overrides={{
                COMPOSER_PLACEHOLDER: $.COMMENT_EDIT_COMPOSER_PLACEHOLDER,
              }}
            />
          ) : (
            <CommentPrimitive.Body
              className="lb-comment-body"
              body={comment.body}
              renderMention={CommentMention}
            />
          )}
        </div>
      </TooltipProvider>
    );
  }
);
