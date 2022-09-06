import { useOthers } from "../../liveblocks.config";
import React from "react";
import { colorToCss, connectionIdToColor } from "../utils";
import Cursor from "./Cursor";
import Path from "./Path";

const MultiplayerGuides = React.memo(() => {
  const others = useOthers();
  return (
    <>
      {others.map((user) => {
        if (user.presence.cursor) {
          return (
            <Cursor
              key={`cursor-${user.connectionId}`}
              x={user.presence.cursor.x}
              y={user.presence.cursor.y}
              color={connectionIdToColor(user.connectionId)}
            />
          );
        }
        return null;
      })}
      {/* All the drawing of other users in the room that are currently in progress */}
      {others.map((user) => {
        if (user.presence.pencilDraft) {
          return (
            <Path
              x={0}
              y={0}
              key={`pencil-${user.connectionId}`}
              points={user.presence.pencilDraft}
              fill={
                user.presence.penColor
                  ? colorToCss(user.presence.penColor)
                  : "#CCC"
              }
            />
          );
        }
        return null;
      })}
    </>
  );
});

export default MultiplayerGuides;
