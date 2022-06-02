import React, { useOthers, useUpdateMyPresence } from "@liveblocks/react";
import Cursor from "./Cursor";

/**
 * This file shows how to add basic live cursors on your product.
 */

const COLORS = [
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#FFF176",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];

type Cursor = {
  x: number;
  y: number;
};

type Presence = {
  cursor: Cursor | null;
};

export default function LiveCursors() {
  /**
   * useMyPresence returns the presence of the current user and a function to update it.
   * updateMyPresence is different to the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   * See https://liveblocks.io/docs/api-reference/liveblocks-react#useMyPresence for more information
   */
  const updateMyPresence = useUpdateMyPresence<Presence>();

  /**
   * Return all the other users in the room and their presence (a cursor position in this case)
   */
  const others = useOthers<Presence>();

  return (
    <div
      className="absolute top-0 left-0 w-full h-screen flex place-content-center place-items-center"
      onPointerMove={(event) =>
        // Update the user cursor position on every pointer move
        updateMyPresence({
          cursor: {
            x: Math.round(event.clientX),
            y: Math.round(event.clientY),
          },
        })
      }
      onPointerLeave={() =>
        // When the pointer goes out, set cursor to null
        updateMyPresence({
          cursor: null,
        })
      }
    >

      {
        /**
         * Iterate over other users and display a cursor based on their presence
         */
        others.map(({ connectionId, presence }) => {
          if (presence == null || presence.cursor == null) {
            return null;
          }

          return (
            <Cursor
              key={`cursor-${connectionId}`}
              // connectionId is an integer that is incremented at every new connections
              // Assigning a color with a modulo makes sure that a specific user has the same colors on every clients
              color={COLORS[connectionId % COLORS.length]}
              x={presence.cursor.x}
              y={presence.cursor.y}
            />
          );
        })
      }
    </div>
  );
}
