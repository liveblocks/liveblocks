"use client";

import { useGroupInfo, useUser } from "@liveblocks/react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useMemo,
} from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../constants";
import { useOverrides } from "../overrides";
import { cn } from "../utils/cn";
import { getInitials } from "../utils/get-initials";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";

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
   * The content to display in the avatar's tooltip.
   */
  tooltip?: ReactNode;

  /**
   * The avatar's outline color.
   */
  color?: string;

  /**
   * Override the avatar's content.
   */
  children?: ReactNode;
}

export interface UserAvatarProps extends ComponentProps<"div"> {
  userId?: string;
  icon?: ReactNode;
  variant?: "default" | "outline";
}

export interface GroupAvatarProps extends ComponentProps<"div"> {
  groupId?: string;
  icon?: ReactNode;
}

export function Avatar({
  src,
  name,
  className,
  children,
  tooltip,
  color,
  style,
  ...props
}: AvatarProps) {
  const initials = useMemo(
    () => (name ? getInitials(name) : undefined),
    [name]
  );

  const avatar = (
    <div
      className={cn("lb-avatar", className)}
      style={
        {
          "--lb-avatar-color": color,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <div className="lb-avatar-content">
        {children ??
          (src ? (
            <img className="lb-avatar-image" src={src} alt={name} />
          ) : initials ? (
            <span className="lb-avatar-fallback" aria-label={name} title={name}>
              {initials}
            </span>
          ) : null)}
      </div>
    </div>
  );

  return tooltip ? (
    <TooltipProvider>
      <Tooltip
        content={tooltip}
        sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
        collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
        side="top"
        align="center"
      >
        {avatar}
      </Tooltip>
    </TooltipProvider>
  ) : (
    avatar
  );
}

function ResolvedUserAvatar({
  userId,
  icon,
  variant = "default",
  ...props
}: ComponentProps<"div"> & {
  userId: string;
  icon?: ReactNode;
  variant?: "default" | "outline";
}) {
  const { user, isLoading } = useUser(userId);

  return (
    <Avatar
      src={user?.avatar}
      name={isLoading ? undefined : (user?.name ?? userId)}
      color={
        variant === "outline"
          ? typeof user?.color === "string"
            ? user.color
            : undefined
          : undefined
      }
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
  variant = "default",
  ...props
}: ComponentProps<"div"> & {
  groupId: string;
  icon?: ReactNode;
  variant?: "default" | "outline";
}) {
  const { info, isLoading } = useGroupInfo(groupId);

  const color =
    variant === "outline"
      ? typeof info?.color === "string"
        ? info.color
        : undefined
      : undefined;

  return (
    <Avatar
      src={info?.avatar}
      name={isLoading ? undefined : (info?.name ?? groupId)}
      color={color}
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
export function UserAvatar({
  userId,
  icon,
  variant = "default",
  ...props
}: UserAvatarProps) {
  const $ = useOverrides();

  if (!userId) {
    return (
      <Avatar name={$.USER_UNKNOWN} {...props}>
        {icon}
      </Avatar>
    );
  }

  return (
    <ResolvedUserAvatar
      userId={userId}
      icon={icon}
      variant={variant}
      {...props}
    />
  );
}

/**
 * @private
 */
export function GroupAvatar({ groupId, icon, ...props }: GroupAvatarProps) {
  if (!groupId) {
    return <Avatar {...props}>{icon}</Avatar>;
  }

  return <ResolvedGroupAvatar groupId={groupId} icon={icon} {...props} />;
}
