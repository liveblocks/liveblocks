"use client";

import { useGroupInfo, useUser } from "@liveblocks/react";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { cn } from "../../utils/cn";
import { getInitials } from "../../utils/get-initials";

export interface AvatarProps extends ComponentProps<"div"> {
  src?: string;
  name?: string;
  fallback?: string;
  isLoading: boolean;
}

export interface UserAvatarProps extends ComponentProps<"div"> {
  /**
   * The user ID to display the avatar for.
   */
  userId: string;
}

export interface GroupAvatarProps extends ComponentProps<"div"> {
  /**
   * The group ID to display the avatar for.
   */
  groupId: string;
}

export function Avatar({
  src,
  name,
  fallback,
  isLoading,
  className,
  ...props
}: AvatarProps) {
  const nameInitials = useMemo(
    () => (name ? getInitials(name) : undefined),
    [name]
  );
  const fallbackInitials = useMemo(
    () => (!isLoading && fallback && !name ? getInitials(fallback) : undefined),
    [isLoading, fallback, name]
  );

  return (
    <div
      className={cn("lb-avatar", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {src && <img className="lb-avatar-image" src={src} alt={name} />}
      {nameInitials ? (
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

export function UserAvatar({ userId, ...props }: UserAvatarProps) {
  const { user, isLoading } = useUser(userId);

  return (
    <Avatar
      src={user?.avatar}
      name={user?.name}
      fallback={userId}
      isLoading={isLoading}
      {...props}
    />
  );
}

export function GroupAvatar({ groupId, ...props }: GroupAvatarProps) {
  const { info, isLoading } = useGroupInfo(groupId);

  return (
    <Avatar
      src={info?.avatar}
      name={info?.name}
      fallback={groupId}
      isLoading={isLoading}
      {...props}
    />
  );
}
