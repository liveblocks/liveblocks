"use client";

import { useGroupInfo, useUser } from "@liveblocks/react";
import { type ComponentProps, type ReactNode, useMemo } from "react";

import { useOverrides } from "../overrides";
import { cn } from "../utils/cn";
import { getInitials } from "../utils/get-initials";

export interface AvatarProps extends ComponentProps<"div"> {
  /**
   * The URL of the avatar's image.
   */
  src?: string;

  /**
   * The name of the avatar.
   */
  name?: string;

  /**
   * Override the avatar's content.
   */
  children?: ReactNode;
}

export interface UserAvatarProps extends ComponentProps<"div"> {
  userId?: string;
  icon?: ReactNode;
}

export interface GroupAvatarProps extends ComponentProps<"div"> {
  groupId: string;
  icon?: ReactNode;
}

export function Avatar({
  src,
  name,
  className,
  children,
  ...props
}: AvatarProps) {
  const initials = useMemo(
    () => (name ? getInitials(name) : undefined),
    [name]
  );

  return (
    <div className={cn("lb-avatar", className)} {...props}>
      {children ??
        (src ? (
          <img className="lb-avatar-image" src={src} alt={name} />
        ) : initials ? (
          <span className="lb-avatar-fallback" aria-label={name} title={name}>
            {initials}
          </span>
        ) : null)}
    </div>
  );
}

function ResolvedUserAvatar({
  userId,
  icon,
  ...props
}: ComponentProps<"div"> & {
  userId: string;
  icon?: ReactNode;
}) {
  const { user, isLoading } = useUser(userId);

  return (
    <Avatar
      src={user?.avatar}
      name={isLoading ? undefined : (user?.name ?? userId)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {icon && (isLoading || !user?.avatar) ? icon : null}
    </Avatar>
  );
}

function ResolvedGroupAvatar({
  groupId,
  icon,
  ...props
}: ComponentProps<"div"> & {
  groupId: string;
  icon?: ReactNode;
}) {
  const { info, isLoading } = useGroupInfo(groupId);

  return (
    <Avatar
      src={info?.avatar}
      name={isLoading ? undefined : (info?.name ?? groupId)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {icon && (isLoading || !info?.avatar) ? icon : null}
    </Avatar>
  );
}

/**
 * @private
 */
export function UserAvatar({ userId, icon, ...props }: UserAvatarProps) {
  const $ = useOverrides();

  if (!userId) {
    return icon ? (
      <div {...props}>{icon}</div>
    ) : (
      <Avatar name={$.USER_UNKNOWN} {...props} />
    );
  }

  return <ResolvedUserAvatar userId={userId} icon={icon} {...props} />;
}

/**
 * @private
 */
export function GroupAvatar({ groupId, icon, ...props }: GroupAvatarProps) {
  return <ResolvedGroupAvatar groupId={groupId} icon={icon} {...props} />;
}
