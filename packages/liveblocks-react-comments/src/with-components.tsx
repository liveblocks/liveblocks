"use client";

import type { BaseMetadata, BaseUserMeta, CommentData } from "@liveblocks/core";
import type {
  ComponentPropsWithoutRef,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import React, { forwardRef, useMemo } from "react";

import { Comment as DefaultComment } from "./components/Comment";
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

  const Comment = forwardRef<HTMLDivElement, CommentProps>(
    ({ comment, ...props }, forwardedRef) => {
      // const [isEditing, setEditing] = useState(false);

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
          <DefaultComment.Body body={comment.body} />
        </div>
      );
    }
  );

  return {
    ...context,
    Comment,
  };
}
