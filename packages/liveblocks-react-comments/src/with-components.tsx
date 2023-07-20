"use client";

import type { BaseMetadata, BaseUserMeta, CommentData } from "@liveblocks/core";
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
import { Time } from "./components/Time";
import type { CommentsContext } from "./factory";
import { EllipsisIcon } from "./icons/ellipsis";
import { classNames } from "./utils/class-names";
import { getInitials } from "./utils/get-initials";

export type CommentsContextWithComponents<
  TThreadMetadata extends BaseMetadata,
  TUserMeta extends BaseUserMeta,
> = CommentsContext<TThreadMetadata, TUserMeta> & {
  Comment: ForwardRefExoticComponent<
    CommentProps & RefAttributes<HTMLDivElement>
  >;
};

type UserStringResolver<TUserMeta extends BaseUserMeta> = (
  user: TUserMeta,
  userId: string
) => string;

type Options<TUserMeta extends BaseUserMeta> = {
  resolveUserName?: UserStringResolver<TUserMeta>;
  resolveUserAvatar?: UserStringResolver<TUserMeta>;

  // TODO: Option to override the strings of all components
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

function useResolvedUserString<TUserMeta extends BaseUserMeta>(
  userId: string,
  user?: TUserMeta | undefined,
  resolver?: UserStringResolver<TUserMeta> | undefined
) {
  return useMemo(() => {
    return user ? resolver?.(user, userId) : undefined;
  }, [resolver, user, userId]);
}

export function withComponents<
  TThreadMetadata extends BaseMetadata,
  TUserMeta extends BaseUserMeta,
>(
  context: CommentsContext<TThreadMetadata, TUserMeta>,
  options?: Options<TUserMeta>
): CommentsContextWithComponents<TThreadMetadata, TUserMeta> {
  const {
    suspense: { useUser },
  } = context;
  const { resolveUserName, resolveUserAvatar } = options ?? {};

  // TODO: Handle loading and error states
  function Avatar({ userId, className, ...props }: AvatarProps) {
    const { user } = useUser(userId);
    const resolvedUserName = useResolvedUserString(
      userId,
      user,
      resolveUserName
    );
    const resolvedUserAvatar = useResolvedUserString(
      userId,
      user,
      resolveUserAvatar
    );
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
    const resolvedUserName = useResolvedUserString(
      userId,
      user,
      resolveUserName
    );

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
            <Time date={comment.createdAt} className="lb-comment-date-time" />
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
            <DefaultComposer.Form onCommentSubmit={handleEditSubmit}>
              <DefaultComposer.Body
                placeholder="Edit comment…"
                initialValue={comment.body}
              />
              <div>
                <button onClick={handleEditCancel}>Cancel</button>
                <DefaultComposer.Submit>Save</DefaultComposer.Submit>
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
