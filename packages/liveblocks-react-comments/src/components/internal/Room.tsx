"use client";

import { kInternal } from "@liveblocks/core";
import { useLiveblocksContextBundle } from "@liveblocks/react";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { classNames } from "../../utils/class-names";

export interface RoomProps extends ComponentProps<"span"> {
  roomId: string;
}

export function Room({ roomId, className, ...props }: RoomProps) {
  const {
    [kInternal]: { useRoomDetails },
  } = useLiveblocksContextBundle();
  const { details, isLoading } = useRoomDetails(roomId);
  const resolvedRoomName = useMemo(() => {
    return details?.name ?? roomId;
  }, [details?.name, roomId]);

  return (
    <span
      className={classNames("lb-name lb-room", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : resolvedRoomName}
    </span>
  );
}
