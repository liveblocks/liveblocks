"use client";

import { useRoomContextBundle } from "@liveblocks/react";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { classNames } from "../../utils/class-names";
import { getInitials } from "../../utils/get-initials";

export interface AvatarProps extends ComponentProps<"div"> {
  userId: string;
}

export function Avatar({ userId, className, ...props }: AvatarProps) {
  const { useUser } = useRoomContextBundle();
  const { user, isLoading } = useUser(userId);
  const resolvedUserName = useMemo(() => user?.name, [user]);
  const resolvedUserAvatar = useMemo(() => user?.avatar, [user]);
  const resolvedUserInitials = useMemo(
    () => (resolvedUserName ? getInitials(resolvedUserName) : undefined),
    [resolvedUserName]
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
      {resolvedUserInitials && (
        <span className="lb-avatar-fallback" aria-hidden>
          {resolvedUserInitials}
        </span>
      )}
    </div>
  );
}
