import type { BaseUserInfo } from "@liveblocks/core";
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
  const { user } = useUser(userId);
  const resolvedUserName = useMemo(() => (user as BaseUserInfo)?.name, [user]);
  const resolvedUserAvatar = useMemo(
    () => (user as BaseUserInfo)?.avatar,
    [user]
  );
  const resolvedUserInitials = useMemo(
    () => (resolvedUserName ? getInitials(resolvedUserName) : undefined),
    [resolvedUserName]
  );

  return (
    <div className={classNames("lb-avatar", className)} {...props}>
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
