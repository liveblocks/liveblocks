"use client";

import type { BaseMetadata, BaseUserInfo, CommentData } from "@liveblocks/core";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type {
  ComponentPropsWithoutRef,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import React, { forwardRef, useCallback, useMemo, useState } from "react";

import { Comment as DefaultComment } from "./components/Comment";
import type { ComposerSubmitComment } from "./components/Composer";
import { Composer as DefaultComposer } from "./components/Composer";
import { Timestamp } from "./components/Timestamp";
import type { CommentsContext } from "./factory";
import { CheckIcon } from "./icons/check";
import { CrossIcon } from "./icons/cross";
import { EllipsisIcon } from "./icons/ellipsis";
import { MentionIcon } from "./icons/mention";
import { classNames } from "./utils/class-names";
import { getInitials } from "./utils/get-initials";

export type CommentsContextWithComponents<
  TThreadMetadata extends BaseMetadata,
  TUserInfo extends BaseUserInfo,
> = CommentsContext<TThreadMetadata, TUserInfo> & {
  Comment: ForwardRefExoticComponent<
    CommentProps & RefAttributes<HTMLDivElement>
  >;
};

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  comment: CommentData;
}

interface AvatarProps extends ComponentPropsWithoutRef<"div"> {
  userId: string;
}

interface NameProps extends ComponentPropsWithoutRef<"span"> {
  userId: string;
}

export function withComponents<
  TThreadMetadata extends BaseMetadata,
  TUserInfo extends BaseUserInfo,
>(
  context: CommentsContext<TThreadMetadata, TUserInfo>
): CommentsContextWithComponents<TThreadMetadata, TUserInfo> {
  const {
    suspense: { useUser },
  } = context;

  // TODO: Handle loading and error states
  function Avatar({ userId, className, ...props }: AvatarProps) {
    const { user } = useUser(userId);
    const resolvedUserName = useMemo(() => user?.name, [user]);
    const resolvedUserAvatar = useMemo(() => user?.avatar, [user]);
    const resolvedUserInitials = useMemo(
      () => (resolvedUserName ? getInitials(resolvedUserName) : undefined),
      [resolvedUserName]
    );

    return (
      <div className={classNames(className, "lb-avatar")} {...props}>
        {resolvedUserAvatar && (
          <img
            className="lb-avatar-image"
            src={resolvedUserAvatar}
            alt={resolvedUserName}
          />
        )}
        {resolvedUserInitials && (
          <span className="lb-avatar-placeholder">{resolvedUserInitials}</span>
        )}
      </div>
    );
  }

  // TODO: Handle loading and error states
  function Name({ userId, ...props }: NameProps) {
    const { user } = useUser(userId);
    const resolvedUserName = useMemo(() => user?.name, [user]);

    return <span {...props}>{resolvedUserName}</span>;
  }

  // TODO: Add option to align the body with the avatar or the name (adds/removes a class name)
  const Comment = forwardRef<HTMLDivElement, CommentProps>(
    ({ comment, className, ...props }, forwardedRef) => {
      const [isEditing, setEditing] = useState(false);

      const handleEdit = useCallback(() => {
        setEditing(true);
      }, []);

      const handleEditCancel = useCallback(() => {
        setEditing(false);
      }, []);

      const handleEditSubmit = useCallback(
        ({ body }: ComposerSubmitComment) => {
          // TODO: How do we get the room ID and thread ID here?
          // editComment("TODO", {
          //   commentId: comment.id,
          //   threadId: "TODO",
          //   body,
          // });
          console.log(body);
          setEditing(false);
        },
        []
      );

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
          {/* TODO: Only show if permissions (for now = own comments) allow edit/delete */}
          {!isEditing && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className="lb-comment-button lb-comment-actions-button"
                aria-label="Comment actions"
              >
                <EllipsisIcon />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                {/* TODO: Share viewport padding/spacing values with the mentions suggestions inset */}
                <DropdownMenu.Content className="lb-comment-actions">
                  <DropdownMenu.Item
                    className="lb-comment-action"
                    onSelect={handleEdit}
                  >
                    Edit
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="lb-comment-action"
                    onSelect={handleDelete}
                  >
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          {isEditing ? (
            <DefaultComposer.Form
              className="lb-composer-form lb-comment-composer"
              onCommentSubmit={handleEditSubmit}
            >
              <DefaultComposer.Editor
                className="lb-composer-editor"
                placeholder="Edit comment…"
                initialValue={comment.body}
              />
              <div className="TODO:">
                <div className="lb-composer-actions">
                  <button
                    className="lb-composer-button lb-composer-action"
                    aria-label="Insert mention"
                  >
                    <MentionIcon />
                  </button>
                </div>
                <div className="TODO:">
                  <button
                    className="lb-composer-button TODO:"
                    aria-label="Cancel"
                    onClick={handleEditCancel}
                  >
                    <CrossIcon />
                  </button>
                  <DefaultComposer.Submit
                    className="lb-composer-button TODO:"
                    aria-label="Save"
                  >
                    <CheckIcon />
                  </DefaultComposer.Submit>
                </div>
              </div>
            </DefaultComposer.Form>
          ) : (
            <DefaultComment.Body
              className="lb-comment-body"
              body={comment.body}
            />
          )}
        </div>
      );
    }
  );

  return {
    ...context,
    Comment,
  };
}
