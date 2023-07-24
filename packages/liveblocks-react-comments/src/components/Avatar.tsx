import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { useCommentsContext } from "../factory";
import { classNames } from "../utils/class-names";
import { getInitials } from "../utils/get-initials";

export interface AvatarProps extends ComponentProps<"div"> {
  userId: string;
  round?: boolean;
}

// TODO: Handle loading and error states
export function Avatar({
  userId,
  round = true,
  className,
  ...props
}: AvatarProps) {
  const { useUser } = useCommentsContext();
  const { user } = useUser(userId);
  const resolvedUserName = useMemo(() => user?.name, [user]);
  const resolvedUserAvatar = useMemo(() => user?.avatar, [user]);
  const resolvedUserInitials = useMemo(
    () => (resolvedUserName ? getInitials(resolvedUserName) : undefined),
    [resolvedUserName]
  );

  return (
    <div
      className={classNames("lb-avatar", round && "lb-avatar:round", className)}
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
        <span className="lb-avatar-fallback">{resolvedUserInitials}</span>
      )}
    </div>
  );
}
