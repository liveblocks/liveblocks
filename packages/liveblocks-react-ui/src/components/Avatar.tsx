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
   * The fallback text if no name is provided.
   */
  fallback?: string;
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
  fallback,
  className,
  ...props
}: AvatarProps) {
  const nameInitials = useMemo(
    () => (name ? getInitials(name) : undefined),
    [name]
  );
  const fallbackInitials = useMemo(
    () => (fallback && !name ? getInitials(fallback) : undefined),
    [fallback, name]
  );

  return (
    <div className={cn("lb-avatar", className)} {...props}>
      {src ? (
        <img className="lb-avatar-image" src={src} alt={name} />
      ) : nameInitials ? (
        <span className="lb-avatar-fallback" aria-hidden>
          {nameInitials}
        </span>
      ) : fallbackInitials ? (
        <span
          className="lb-avatar-fallback"
          aria-label={fallback}
          title={fallback}
        >
          {fallbackInitials}
        </span>
      ) : null}
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

  return icon && (isLoading || !user?.avatar) ? (
    <div {...props}>{icon}</div>
  ) : (
    <Avatar
      src={user?.avatar}
      name={user?.name}
      fallback={isLoading ? undefined : userId}
      data-loading={isLoading ? "" : undefined}
      {...props}
    />
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

  return icon && (isLoading || !info?.avatar) ? (
    <div {...props}>{icon}</div>
  ) : (
    <Avatar
      src={info?.avatar}
      name={info?.name}
      fallback={isLoading ? undefined : groupId}
      data-loading={isLoading ? "" : undefined}
      {...props}
    />
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
      <Avatar fallback={$.USER_UNKNOWN} {...props} />
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
