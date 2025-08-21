"use client";

import type { Relax } from "@liveblocks/core";
import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";

import { cn } from "../../utils/cn";
import { getInitials } from "../../utils/get-initials";
import { useUserOrGroupInfo } from "../../utils/use-user-or-group-info";

interface AvatarLayoutProps extends ComponentProps<"div"> {
  src?: string;
  name?: string;
  fallback?: string;
  isLoading: boolean;
}

export type AvatarProps = ComponentProps<"div"> & {
  icon?: ReactNode;
} & Relax<
    | {
        /**
         * The user ID to display the avatar for.
         */
        userId: string;
      }
    | {
        /**
         * The group ID to display the avatar for.
         */
        groupId: string;
      }
  >;

function AvatarLayout({
  src,
  name,
  fallback,
  isLoading,
  className,
  ...props
}: AvatarLayoutProps) {
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

export function Avatar({ userId, groupId, icon, ...props }: AvatarProps) {
  const { info, isLoading } = useUserOrGroupInfo(
    userId ? "user" : "group",
    userId ?? groupId
  );

  return icon && (isLoading || !info?.avatar) ? (
    <div {...props}>{icon}</div>
  ) : (
    <AvatarLayout
      src={info?.avatar}
      name={info?.name}
      fallback={userId ?? groupId}
      isLoading={isLoading}
      {...props}
    />
  );
}
