import type { CommentData } from "@liveblocks/core";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback, useState } from "react";

import { CheckIcon } from "../icons/check";
import { CrossIcon } from "../icons/cross";
import { EllipsisIcon } from "../icons/ellipsis";
import type { CommentRenderMentionProps } from "../primitives/Comment";
import { Comment as CommentPrimitive } from "../primitives/Comment";
import type { ComposerSubmitComment } from "../primitives/Composer";
import { Composer as ComposerPrimitive } from "../primitives/Composer";
import { Timestamp } from "../primitives/Timestamp";
import { MENTION_CHARACTER } from "../slate/mentions";
import { classNames } from "../utils/class-names";
import { Avatar } from "./Avatar";
import { ComposerMenu } from "./Composer";
import { User } from "./User";

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  comment: CommentData;
  indentBody?: boolean;
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
  ({ comment, indentBody = true, className, ...props }, forwardedRef) => {
    // const { useEditComment, useDeleteComment } = useCommentsContext();
    // const editComment = useEditComment();
    // const deleteComment = useDeleteComment();
    const [isEditing, setEditing] = useState(false);

    const handleEdit = useCallback(() => {
      setEditing(true);
    }, []);

    const handleEditCancel = useCallback(() => {
      setEditing(false);
    }, []);

    const handleEditSubmit = useCallback(({ body }: ComposerSubmitComment) => {
      // TODO: Add comment.threadId to the model
      // editComment({
      //   commentId: comment.id,
      //   threadId: "TODO",
      //   body,
      // });
      console.log(body);
      setEditing(false);
    }, []);

    const handleDelete = useCallback(() => {
      // TODO: Add comment.threadId to the model
      // deleteComment({
      //   commentId: comment.id,
      //   threadId: "TODO",
      // });
    }, []);

    // TODO: Add option to render a `This comment was deleted` placeholder instead
    if (!comment.body) {
      return null;
    }

    return (
      <div
        className={classNames(
          "lb-comment",
          indentBody && "lb-comment:indent-body",
          className
        )}
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
            <div className="lb-comment-actions">
              {/* TODO: Only show if permissions (for now = own comments) allow edit/delete */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  className="lb-button lb-comment-action"
                  aria-label="Comment options"
                >
                  <EllipsisIcon />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  {/* TODO: Share viewport padding/spacing values with the mentions suggestions inset */}
                  <DropdownMenu.Content className="lb-dropdown" align="end">
                    <DropdownMenu.Item
                      className="lb-dropdown-item"
                      onSelect={handleEdit}
                    >
                      Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="lb-dropdown-item"
                      onSelect={handleDelete}
                    >
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}
        </div>
        {isEditing ? (
          <ComposerPrimitive.Form
            className="lb-composer-form lb-comment-composer"
            onCommentSubmit={handleEditSubmit}
          >
            <ComposerPrimitive.Editor
              className="lb-composer-editor"
              placeholder="Edit comment…"
              initialValue={comment.body}
            />
            <ComposerMenu
              actions={
                <>
                  <button
                    className="lb-composer-button lb-composer-action"
                    aria-label="Cancel"
                    onClick={handleEditCancel}
                  >
                    <CrossIcon />
                  </button>
                  <ComposerPrimitive.Submit
                    className="lb-composer-button lb-composer-action"
                    aria-label="Save"
                  >
                    <CheckIcon />
                  </ComposerPrimitive.Submit>
                </>
              }
            />
          </ComposerPrimitive.Form>
        ) : (
          <CommentPrimitive.Body
            className="lb-comment-body"
            body={comment.body}
            renderMention={CommentMention}
          />
        )}
      </div>
    );
  }
);
