import * as React from "react";
import { User } from "../types";
import { connectionIdToColor } from "../utils";

export interface UserCursorProps {
  cursor: { x: number; y: number };
  connectionId: number;
  isActive: boolean;
}

export const UserCursor = React.memo(
  ({ cursor, connectionId, isActive }: UserCursorProps) => {
    return (
      <circle
        cx={cursor.x}
        cy={cursor.y}
        r={4}
        fill={isActive ? connectionIdToColor(connectionId) : "grey"}
      />
    );
  }
);
