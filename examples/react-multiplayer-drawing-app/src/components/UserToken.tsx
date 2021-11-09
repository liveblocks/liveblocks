import * as React from "react";
import { User } from "../types";
import { connectionIdToColor } from "../utils";

export interface UserTokenProps {
  connectionId: number;
  user: User;
  isSelf: boolean;
  index: number;
}

export const UserToken = React.memo(
  ({ connectionId, user, isSelf, index }: UserTokenProps) => {
    return (
      <>
        <circle
          key={connectionId + "_token"}
          cx={32 + 16 * index}
          cy={32}
          r={16}
          strokeWidth={2}
          stroke="white"
          fill={user.isActive ? connectionIdToColor(connectionId) : "grey"}
        />
        {isSelf && (
          <circle
            cx={32 + 16 * index}
            cy={56}
            r={4}
            fill={connectionIdToColor(connectionId)}
          />
        )}
      </>
    );
  }
);
