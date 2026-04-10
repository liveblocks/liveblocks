"use client";

import { useOthers, useSelf } from "@liveblocks/react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { forwardRef, useMemo } from "react";

import {
  FLOATING_ELEMENT_COLLISION_PADDING,
  FLOATING_ELEMENT_SIDE_OFFSET,
} from "../constants";
import type { GlobalOverrides } from "../overrides";
import { useOverrides } from "../overrides";
import { cn } from "../utils/cn";
import { px } from "../utils/px";
import { UserAvatar } from "./Avatar";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";
import { User } from "./internal/User";

export interface AvatarStackProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Optional additional user IDs to include in the stack.
   */
  userIds?: string[];

  /**
   * The maximum number of items in the stack (at least 2).
   * Defaults to 3, set to `null` to show all avatars.
   */
  max?: number | null;

  /**
   * The size of the avatars.
   */
  size?: string | number;

  /**
   * The gap around the avatars.
   */
  gap?: string | number;

  /**
   * The avatar stack visual variant.
   */
  variant?: "default" | "outline";

  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides>;
}

type AvatarStackUser = {
  key: string;
  userId: string | null;
};

/**
 * Displays a stack of avatars for the users currently present in the room.
 */
export const AvatarStack = forwardRef<HTMLDivElement, AvatarStackProps>(
  (
    {
      userIds: additionalUserIds = [],
      max = 3,
      size,
      gap,
      variant = "default",
      overrides,
      className,
      style,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const otherUsers = useOthers((others) =>
      [...others]
        .sort((a, b) => b.connectionId - a.connectionId)
        .map((user) => ({
          connectionId: user.connectionId,
          userId: user.id,
        }))
    );
    const selfUser = useSelf((self) => ({
      connectionId: self.connectionId,
      userId: self.id,
    }));
    const users = useMemo<AvatarStackUser[]>(() => {
      const uniqueUsers = new Map<string, AvatarStackUser>();

      const addUser = ({
        connectionId,
        userId,
      }: {
        connectionId: number;
        userId: string | null | undefined;
      }) => {
        if (userId !== null && userId !== undefined) {
          const key = `user:${userId}`;
          uniqueUsers.set(key, { key, userId });
        } else {
          const key = `connection:${connectionId}`;
          uniqueUsers.set(key, { key, userId: null });
        }
      };

      if (selfUser) {
        addUser(selfUser);
      }

      for (const otherUser of otherUsers) {
        addUser(otherUser);
      }

      for (const additionalUserId of additionalUserIds) {
        if (additionalUserId !== null && additionalUserId !== undefined) {
          const key = `user:${additionalUserId}`;
          uniqueUsers.set(key, { key, userId: additionalUserId });
        }
      }

      return [...uniqueUsers.values()];
    }, [selfUser, otherUsers, additionalUserIds]);
    const maxItems = max === null ? Infinity : Math.max(2, Math.floor(max));
    const shouldShowMore = users.length > maxItems;
    const visibleAvatarsCount = shouldShowMore ? maxItems - 1 : maxItems;
    const visibleUsers = users.slice(0, visibleAvatarsCount);
    const hiddenUsers = users.slice(visibleUsers.length);
    const remainingUsersCount = hiddenUsers.length;
    const visibleItemsCount =
      visibleUsers.length + Number(remainingUsersCount > 0);

    if (users.length === 0) {
      return null;
    }

    return (
      <TooltipProvider>
        <div
          className={cn("lb-root lb-avatar-stack", className)}
          dir={$.dir}
          style={
            {
              "--lb-avatar-stack-count": visibleItemsCount,
              "--lb-avatar-stack-size": px(size),
              "--lb-avatar-stack-gap": px(gap),
              ...style,
            } as CSSProperties
          }
          {...props}
          ref={forwardedRef}
        >
          {visibleUsers.map((user, index) => {
            return (
              <UserAvatar
                key={user.key}
                userId={user.userId ?? undefined}
                variant={variant}
                className="lb-avatar-stack-avatar"
                style={{ "--lb-avatar-stack-index": index } as CSSProperties}
                tooltip={<User userId={user.userId ?? undefined} />}
              />
            );
          })}
          {remainingUsersCount > 0 ? (
            <Tooltip
              content={
                <ul className="lb-users-tooltip-list">
                  {hiddenUsers.map((user) => (
                    <li key={user.key} className="lb-users-tooltip-list-item">
                      <UserAvatar userId={user.userId ?? undefined} />
                      <User userId={user.userId ?? undefined} />
                    </li>
                  ))}
                </ul>
              }
              sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
              collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
              side="top"
              align="center"
              className="lb-users-tooltip"
            >
              <div
                className="lb-avatar lb-avatar-stack-avatar lb-avatar-stack-more"
                style={
                  {
                    "--lb-avatar-stack-index": visibleUsers.length,
                  } as CSSProperties
                }
              >
                <span className="lb-avatar-fallback">
                  +{remainingUsersCount}
                </span>
              </div>
            </Tooltip>
          ) : null}
        </div>
      </TooltipProvider>
    );
  }
);
