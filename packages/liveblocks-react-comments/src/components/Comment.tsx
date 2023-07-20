import type { CommentData } from "@liveblocks/core";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef } from "react";
import React, { forwardRef, useCallback, useState } from "react";

import { CheckIcon } from "../icons/check";
import { CrossIcon } from "../icons/cross";
import { EllipsisIcon } from "../icons/ellipsis";
import { Comment as CommentPrimitive } from "../primitives/Comment";
import type { ComposerSubmitComment } from "../primitives/Composer";
import { Composer as ComposerPrimitive } from "../primitives/Composer";
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { Avatar } from "./Avatar";
import { ComposerMenu } from "./Composer";
import { Name } from "./Name";

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  comment: CommentData;
}

// TODO: Add option to align the body with the avatar or the name (adds/removes a class name)
export const Comment = forwardRef<HTMLDivElement, CommentProps>(
  ({ comment, className, ...props }, forwardedRef) => {
    const [isEditing, setEditing] = useState(false);

    const handleEdit = useCallback(() => {
      setEditing(true);
    }, []);

    const handleEditCancel = useCallback(() => {
      setEditing(false);
    }, []);

    const handleEditSubmit = useCallback(({ body }: ComposerSubmitComment) => {
      // TODO: How do we get the room ID and thread ID here?
      // editComment("TODO", {
      //   commentId: comment.id,
      //   threadId: "TODO",
      //   body,
      // });
      console.log(body);
      setEditing(false);
    }, []);

    const handleDelete = useCallback(() => {
      // TODO: How do we get the room ID and thread ID here?
      // deleteComment("TODO", {
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
        className={classNames(className, "lb-avatar")}
        {...props}
        ref={forwardedRef}
      >
        <Avatar className="lb-comment-avatar" userId={comment.userId} />
        <Name className="lb-comment-name" userId={comment.userId} />
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
        {!isEditing && (
          <div className="lb-comment-actions">
            {/* TODO: Only show if permissions (for now = own comments) allow edit/delete */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className="lb-comment-button lb-comment-action"
                aria-label="Comment options"
              >
                <EllipsisIcon />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                {/* TODO: Share viewport padding/spacing values with the mentions suggestions inset */}
                <DropdownMenu.Content className="lb-comment-options">
                  <DropdownMenu.Item
                    className="lb-comment-option"
                    onSelect={handleEdit}
                  >
                    Edit
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="lb-comment-option"
                    onSelect={handleDelete}
                  >
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
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
          />
        )}
      </div>
    );
  }
);
