"use client";

import { useRoomContextBundle } from "@liveblocks/react";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { useOverrides } from "../../overrides";
import { classNames } from "../../utils/class-names";

export interface UserProps extends ComponentProps<"span"> {
  userId: string;
}

export function User({ userId, className, ...props }: UserProps) {
  const { useUser } = useRoomContextBundle();
  const { user, isLoading } = useUser(userId);
  const $ = useOverrides();
  const resolvedUserName = useMemo(
    () => user?.name ?? $.UNKNOWN_USER,
    [$.UNKNOWN_USER, user?.name]
  );

  return (
    <span
      className={classNames("lb-user", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : resolvedUserName}
    </span>
  );
}
