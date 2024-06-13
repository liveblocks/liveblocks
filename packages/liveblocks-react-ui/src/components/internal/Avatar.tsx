"use client";

import { useUser } from "@liveblocks/react";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { classNames } from "../../utils/class-names";
import { getInitials } from "../../utils/get-initials";

export interface AvatarProps extends ComponentProps<"div"> {
  /**
   * The user ID to display the avatar for.
   */
  userId: string;
}

export function Avatar({ userId, className, ...props }: AvatarProps) {
  const { user, isLoading } = useUser(userId);
  const resolvedUserName = useMemo(() => user?.name, [user]);
  const resolvedUserAvatar = useMemo(() => user?.avatar, [user]);
  const resolvedUserInitials = useMemo(
    () => (resolvedUserName ? getInitials(resolvedUserName) : undefined),
    [resolvedUserName]
  );
  const resolvedUserIdInitials = useMemo(
    () => (!isLoading && !user ? getInitials(userId) : undefined),
    [isLoading, user, userId]
  );

  return (
    <div
      className={classNames("lb-avatar", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {resolvedUserAvatar && (
        <img
          className="lb-avatar-image"
          src={resolvedUserAvatar}
          alt={resolvedUserName}
        />
      )}
      {resolvedUserInitials ? (
        <span className="lb-avatar-fallback" aria-hidden>
          {resolvedUserInitials}
        </span>
      ) : resolvedUserIdInitials ? (
        <span className="lb-avatar-fallback" aria-label={userId} title={userId}>
          {resolvedUserIdInitials}
        </span>
      ) : null}
    </div>
  );
}
