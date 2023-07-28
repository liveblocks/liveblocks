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
import type { CommentRenderMentionProps } from "../primitives/Comment";
import { Comment as CommentPrimitive } from "../primitives/Comment";
import { Composer as ComposerPrimitive } from "../primitives/Composer";
import { Timestamp } from "../primitives/Timestamp";
import { MENTION_CHARACTER } from "../slate/mentions";
import { classNames } from "../utils/class-names";
import { Avatar } from "./Avatar";
import { Composer } from "./Composer";
import { Dropdown, DropdownTrigger } from "./Dropdown";
import { Tooltip, TooltipProvider } from "./Tooltip";
import { User } from "./User";

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * TODO: JSDoc
   */
  comment: CommentData;

  /**
   * TODO: JSDoc
   */
  indentBody?: boolean;

  /**
   * TODO: JSDoc
   */
  alwaysShowActions?: boolean;

  /**
   * @internal
   *
   * This is a private API and should not be used.
   */
  additionalActions?: ReactNode;

  /**
   * @internal
   *
   * This is a private API and should not be used.
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
      alwaysShowActions,
      additionalActions,
      additionalActionsClassName,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useDeleteComment } = useCommentsContext();
    const deleteComment = useDeleteComment();
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
            "lb-comment",
            indentBody && "lb-comment:indent-body",
            alwaysShowActions && "lb-comment:always-show-actions",
            className
          )}
          data-dropdown-open={isMoreOpen ? "" : undefined}
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
                    date={comment.createdAt}
                    className="lb-comment-date-timestamp"
                  />
                  {comment.editedAt && (
                    <>
                      {" "}
                      <span className="lb-comment-date-edited">(edited)</span>
                    </>
                  )}
                </span>
              </span>
            </div>
            {!isEditing && (
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
                      >
                        <EditIcon className="lb-dropdown-item-icon" />
                        Edit comment
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="lb-dropdown-item"
                        onSelect={handleDelete}
                      >
                        <DeleteIcon className="lb-dropdown-item-icon" />
                        Delete comment
                      </DropdownMenu.Item>
                    </>
                  }
                >
                  <Tooltip content="More">
                    <DropdownTrigger
                      className="lb-button lb-comment-action"
                      aria-label="More"
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
              autoFocus
              showLogo={false}
              actions={
                <>
                  <Tooltip content="Cancel" aria-label="Cancel">
                    <button
                      type="button"
                      className="lb-button lb-composer-action"
                      onClick={handleEditCancel}
                    >
                      <CrossIcon className="lb-button-icon" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Save">
                    <ComposerPrimitive.Submit
                      className="lb-button lb-button:primary lb-composer-action"
                      aria-label="Save"
                    >
                      <CheckIcon className="lb-button-icon" />
                    </ComposerPrimitive.Submit>
                  </Tooltip>
                </>
              }
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
