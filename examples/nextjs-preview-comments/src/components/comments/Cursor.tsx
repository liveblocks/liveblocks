"use client";

import React, { memo } from "react";
import { useOther } from "@/liveblocks.config";
import { getCoordsFromAccurateCursorPositions } from "@/lib/coords";

type Props = {
  connectionId: number;
};

function CursorComponent({ connectionId }: Props) {
  // Get this user's cursor positions from presence
  const otherPresence = useOther(connectionId, (other) => other.presence);
  if (!otherPresence?.cursor) {
    return null;
  }

  // Convert CSS selectors and x/y percentage into x/y px on page
  const position = getCoordsFromAccurateCursorPositions(otherPresence.cursor);
  if (!position) {
    return;
  }

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translateX(${position.x}px) translateY(${position.y}px)`,
        pointerEvents: "none",
      }}
      width="24"
      height="36"
      viewBox="0 0 24 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        fill={"red"}
      />
    </svg>
  );
}

export const Cursor = memo(CursorComponent);
