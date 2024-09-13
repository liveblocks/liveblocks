"use client";

import { useUser } from "@liveblocks/react";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { useOverrides } from "../../overrides";
import { useCurrentUserId } from "../../shared";
import { classNames } from "../../utils/class-names";

export interface UserProps extends ComponentProps<"span"> {
  /**
   * The user ID to display the user name for.
   */
  userId: string;

  /**
   * Whether to replace the user name with "you" ($.USER_SELF) for the current user.
   */
  replaceSelf?: boolean;
}

export function User({ userId, replaceSelf, className, ...props }: UserProps) {
  const currentId = useCurrentUserId();
  const { user, isLoading } = useUser(userId);
  const $ = useOverrides();
  const resolvedUserName = useMemo(() => {
    return replaceSelf && currentId === userId
      ? $.USER_SELF
      : user?.name ?? $.USER_UNKNOWN;
  }, [replaceSelf, currentId, userId, $.USER_SELF, $.USER_UNKNOWN, user?.name]);

  return (
    <span
      className={classNames("lb-name lb-user", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : resolvedUserName}
    </span>
  );
}
