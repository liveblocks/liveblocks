import {
  useOthersMapped,
  useOthersConnectionIds,
} from "@liveblocks/react/suspense";
import { shallow } from "@liveblocks/client";
import React from "react";
import { colorToCss } from "../utils";
import Cursor from "./Cursor";
import Path from "./Path";

function Cursors() {
  //
  // RATIONALE:
  // We're using useConnectionIds() here instead of useOthers(), because this
  // will only re-render this component if users enter or leave.
  //
  // Each <Cursor /> component we loop over here will subscribe to necessary
  // changes happening for _that_ user alone, which is most rendering
  // efficient.
  //
  const ids = useOthersConnectionIds();
  return (
    <>
      {ids.map((connectionId) => (
        <Cursor key={connectionId} connectionId={connectionId} />
      ))}
    </>
  );
}

function Drafts() {
  const others = useOthersMapped(
    (other) => ({
      pencilDraft: other.presence.pencilDraft,
      penColor: other.presence.penColor,
    }),
    shallow
  );
  return (
    <>
      {/* All the drawing of other users in the room that are currently in progress */}
      {others.map(([key, other]) => {
        if (other.pencilDraft) {
          return (
            <Path
              key={key}
              x={0}
              y={0}
              points={other.pencilDraft}
              fill={other.penColor ? colorToCss(other.penColor) : "#CCC"}
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
