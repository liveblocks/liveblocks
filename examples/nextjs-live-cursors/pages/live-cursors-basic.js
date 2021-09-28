/**
 * This file shows how to add basic live cursors on your product.
 * https://preview.liveblocks.io/docs/examples/live-cursors
 */

import React from "react";
import ExampleInfo from "../components/ExampleInfo";
import { useOthers, useMyPresence, RoomProvider } from "@liveblocks/react";

export default function Room() {
  return (
    <RoomProvider
      id={"example-live-cursors"}
      /**
       * Initialize the cursor position to null when joining the room
       */
      defaultPresence={() => ({
        cursor: null,
      })}
    >
      <PresenceDemo />
      <ExampleInfo
        title="Basic Live Cursors Example"
        description="Open this page in multiple windows to see the live cursors."
        githubHref="https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors"
        codeSandboxHref="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors"
      />
    </RoomProvider>
  );
}

function PresenceDemo() {
  /**
   * useMyPresence returns the presence of the current user and a function to update it.
   * updateMyPresence is different than the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   * See https://liveblocks.io/docs/api-reference/liveblocks-react#useMyPresence for more information
   */
  const [{ cursor }, updateMyPresence] = useMyPresence();

  /**
   * Return all the other users in the room and their presence (a cursor position in this case)
   */
  const others = useOthers();

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
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
      <div className="max-w-sm text-center">
        {cursor
          ? `${cursor.x},${cursor.y}`
          : "Move your cursor to broadcast its position to other people in the room."}
      </div>

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

function Cursor({ color, x, y }) {
  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transition: "transform 0.5s cubic-bezier(.17,.93,.38,1)",
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
      width="24"
      height="36"
      viewBox="0 0 24 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        fill={color}
      />
    </svg>
  );
}

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
