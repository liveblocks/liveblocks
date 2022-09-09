import { useOtherIds } from "../../liveblocks.config";
import { shallow } from "@liveblocks/client";
import React from "react";
import { colorToCss } from "../utils";
import Cursor from "./Cursor";
import Path from "./Path";

function Cursors() {
  const ids = useOtherIds();
  return (
    <>
      {ids.map((connectionId) => (
        <Cursor key={connectionId} connectionId={connectionId} />
      ))}
    </>
  );
}

function Drafts() {
  const others = useOtherIds(
    (other) => ({
      pencilDraft: other.presence.pencilDraft,
      penColor: other.presence.penColor,
    }),
    shallow
  );
  return (
    <>
      {/* All the drawing of other users in the room that are currently in progress */}
      {others.map(({ connectionId, data }) => {
        if (data.pencilDraft) {
          return (
            <Path
              key={connectionId}
              x={0}
              y={0}
              points={data.pencilDraft}
              fill={data.penColor ? colorToCss(data.penColor) : "#CCC"}
            />
          );
        }
        return null;
      })}
    </>
  );
}

export default React.memo(function MultiplayerGuides() {
  return (
    <>
      <Cursors />
      <Drafts />
    </>
  );
});
