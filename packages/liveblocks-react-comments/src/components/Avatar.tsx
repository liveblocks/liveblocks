import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { useCommentsContext } from "../factory";
import { classNames } from "../utils/class-names";
import { getInitials } from "../utils/get-initials";

export interface AvatarProps extends ComponentProps<"div"> {
  userId: string;
}

// TODO: Handle loading and error states
export function Avatar({ userId, className, ...props }: AvatarProps) {
  const { useUser } = useCommentsContext();
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
