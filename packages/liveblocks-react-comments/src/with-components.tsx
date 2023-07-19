"use client";

import type { BaseMetadata, BaseUserMeta, CommentData } from "@liveblocks/core";
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
    editComment,
    deleteComment,
  } = context;
  const { resolveUserName, resolveUserAvatar } = options ?? {};

  // TODO: Handle loading and error states
  function Avatar({ userId, ...props }: AvatarProps) {
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
      <div {...props}>
        {resolvedUserAvatar && (
          <img src={resolvedUserAvatar} alt={resolvedUserName} />
        )}
        {resolvedUserInitials && <span>{resolvedUserInitials}</span>}
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
    ({ comment, ...props }, forwardedRef) => {
      const [isEditing, setEditing] = useState(false);

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
        <div {...props} ref={forwardedRef}>
          <Avatar userId={comment.userId} />
          <Name userId={comment.userId} />
          <span>
            {/* TODO: Add "edited" label */}
            <Time date={comment.createdAt} />
          </span>
          {/* TODO: Add dropdown to edit and delete */}
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
            <DefaultComment.Body body={comment.body} />
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
