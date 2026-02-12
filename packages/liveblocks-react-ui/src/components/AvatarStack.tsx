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
import { Avatar } from "./internal/Avatar";
import { Tooltip, TooltipProvider } from "./internal/Tooltip";
import { User } from "./internal/User";

export interface AvatarStackProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Optional additional user IDs to include in the stack.
   */
  userIds?: string[];

  /**
   * Override the component's strings.
   */
  overrides?: Partial<GlobalOverrides>;
}

/**
 * Displays a stack of avatars for the users currently present in the room.
 */
export const AvatarStack = forwardRef<HTMLDivElement, AvatarStackProps>(
  (
    { userIds: additionalUserIds = [], overrides, className, style, ...props },
    forwardedRef
  ) => {
    const $ = useOverrides(overrides);
    const otherIds = useOthers((others) => others.map((user) => user.id));
    const selfId = useSelf((self) => self.id);
    const userIds = useMemo(() => {
      const uniqueUserIds = new Set([
        selfId,
        ...otherIds,
        ...additionalUserIds,
      ]);

      return [...uniqueUserIds];
    }, [selfId, otherIds, additionalUserIds]);

    if (userIds.length === 0) {
      return null;
    }

    return (
      <TooltipProvider>
        <div
          className={cn("lb-root lb-avatar-stack", className)}
          dir={$.dir}
          style={
            {
              "--lb-avatar-stack-count": userIds.length - 1,
              ...style,
            } as CSSProperties
          }
          {...props}
          ref={forwardedRef}
        >
          {userIds.map((userId, index) => {
            if (!userId) {
              return null;
            }

            return (
              <Tooltip
                key={userId}
                content={<User userId={userId} />}
                sideOffset={FLOATING_ELEMENT_SIDE_OFFSET}
                collisionPadding={FLOATING_ELEMENT_COLLISION_PADDING}
                side="top"
                align="center"
              >
                <Avatar
                  userId={userId}
                  className="lb-avatar-stack-avatar"
                  style={
                    { "--lb-avatar-stack-avatar-index": index } as CSSProperties
                  }
                />
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }
);
