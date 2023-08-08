import type { CommentData } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
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
import * as CommentPrimitive from "../primitives/Comment";
import type { CommentRenderMentionProps } from "../primitives/Comment/types";
import * as ComposerPrimitive from "../primitives/Composer";
import { Timestamp } from "../primitives/Timestamp";
import { MENTION_CHARACTER } from "../slate/mentions";
import { classNames } from "../utils/class-names";
import { Composer } from "./Composer";
import { Avatar } from "./internal/Avatar";
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

function CommentMention({ userId }: CommentRenderMentionProps) {
  const { useSelf } = useRoomContextBundle();
  const self = useSelf();

  return (
    <CommentPrimitive.Mention
      className="lb-comment-mention"
      data-self={userId === self?.id ? "" : undefined}
    >
      {MENTION_CHARACTER}
      <User userId={userId} />
    </CommentPrimitive.Mention>
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
      overrides,
      additionalActions,
      additionalActionsClassName,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const { useDeleteComment } = useRoomContextBundle();
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
              <Avatar className="lb-comment-avatar" userId={comment.userId} />
              <span className="lb-comment-details-labels">
                <User className="lb-comment-user" userId={comment.userId} />
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
                <Dropdown
                  open={isMoreOpen}
                  onOpenChange={setMoreOpen}
                  align="end"
                  content={
                    <>
                      <DropdownItem
                        className="lb-dropdown-item"
                        onSelect={handleEdit}
                      >
                        <EditIcon className="lb-dropdown-item-icon" />
                        {$.COMMENT_EDIT}
                      </DropdownItem>
                      <DropdownItem
                        className="lb-dropdown-item"
                        onSelect={handleDelete}
                      >
                        <DeleteIcon className="lb-dropdown-item-icon" />
                        {$.COMMENT_DELETE}
                      </DropdownItem>
                    </>
                  }
                >
                  <Tooltip content={$.COMMENT_MORE}>
                    <DropdownTrigger
                      className="lb-button lb-comment-action"
                      disabled={!comment.body}
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
                    shortcut={<TooltipShortcutKey name="enter" />}
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
          ) : comment.body ? (
            <CommentPrimitive.Body
              className="lb-comment-body"
              body={comment.body}
              renderMention={CommentMention}
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
