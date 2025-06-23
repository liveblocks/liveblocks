"use client";

import { useRoomInfo } from "@liveblocks/react";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { cn } from "../../utils/cn";

export interface RoomProps extends ComponentProps<"span"> {
  roomId: string;
}

export function Room({ roomId, className, ...props }: RoomProps) {
  const { info, isLoading } = useRoomInfo(roomId);
  const resolvedRoomName = useMemo(() => {
    return info?.name ?? roomId;
  }, [info?.name, roomId]);

  return (
    <span
      className={cn("lb-name lb-room", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : resolvedRoomName}
    </span>
  );
}
