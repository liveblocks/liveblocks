import type { BaseUserInfo } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";

export interface UserProps extends ComponentProps<"span"> {
  userId: string;
}

export function User({ userId, ...props }: UserProps) {
  const { useUser } = useRoomContextBundle();
  const { user } = useUser(userId);
  const resolvedUserName = useMemo(() => (user as BaseUserInfo)?.name, [user]);

  return <span {...props}>{resolvedUserName ?? userId}</span>;
}
