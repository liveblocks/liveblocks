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
import { px } from "../utils/px";
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
   * Whether and how the avatar should have an outline.
   */
  outline?:
    | string
    | boolean
    | { color?: string; width?: string | number; gap?: string | number };

  /**
   * Override the avatar's content.
   */
  children?: ReactNode;
}

export interface UserAvatarProps extends ComponentProps<"div"> {
  userId?: string;
  icon?: ReactNode;
  tooltip?: ReactNode;
  variant?: "default" | "outline";
}

export interface GroupAvatarProps extends ComponentProps<"div"> {
  groupId?: string;
  icon?: ReactNode;
  tooltip?: ReactNode;
  variant?: "default" | "outline";
}

type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export function Avatar({
  src,
  name,
  className,
  children,
  tooltip,
  outline,
  style,
  ...props
}: AvatarProps) {
  const initials = useMemo(
    () => (name ? getInitials(name) : undefined),
    [name]
  );
  const resolvedOutline =
    typeof outline === "object"
      ? outline
      : typeof outline === "string"
        ? { color: outline }
        : outline === true
          ? {}
          : undefined;

  const avatar = (
    <div
      className={cn("lb-avatar", className)}
      data-variant={resolvedOutline ? "outline" : "default"}
      style={
        {
          "--lb-avatar-outline-color": resolvedOutline?.color,
          "--lb-avatar-outline-width": px(resolvedOutline?.width),
          "--lb-avatar-outline-gap": px(resolvedOutline?.gap),
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
  tooltip,
  ...props
}: MakeRequired<UserAvatarProps, "userId">) {
  const { user, isLoading } = useUser(userId);

  return (
    <Avatar
      src={user?.avatar}
      name={isLoading ? undefined : (user?.name ?? userId)}
      outline={
        variant === "outline"
          ? typeof user?.color === "string"
            ? user.color
            : undefined
          : undefined
      }
      data-loading={isLoading ? "" : undefined}
      tooltip={tooltip}
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
  tooltip,
  ...props
}: MakeRequired<GroupAvatarProps, "groupId">) {
  const { info, isLoading } = useGroupInfo(groupId);

  return (
    <Avatar
      src={info?.avatar}
      name={isLoading ? undefined : (info?.name ?? groupId)}
      outline={
        variant === "outline"
          ? typeof info?.color === "string"
            ? info.color
            : undefined
          : undefined
      }
      data-loading={isLoading ? "" : undefined}
      tooltip={tooltip}
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
      <Avatar name={$.USER_UNKNOWN} outline={variant === "outline"} {...props}>
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
export function GroupAvatar({
  groupId,
  icon,
  variant = "default",
  ...props
}: GroupAvatarProps) {
  if (!groupId) {
    return (
      <Avatar outline={variant === "outline"} {...props}>
        {icon}
      </Avatar>
    );
  }

  return (
    <ResolvedGroupAvatar
      groupId={groupId}
      icon={icon}
      variant={variant}
      {...props}
    />
  );
}
