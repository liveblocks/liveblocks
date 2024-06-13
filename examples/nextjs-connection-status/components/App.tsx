"use client";

import { LostConnectionToasts } from "@/components/LostConnectionToasts";
import { Status } from "@/components/Status";
import { LiveAvatars } from "@/components/LiveAvatars";
import { useMyPresence, useOthers } from "@liveblocks/react/suspense";
import Cursor from "@/components/Cursor";
import styles from "./App.module.css";

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

export default function App() {
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
      className={styles.app}
      onPointerMove={(event) => {
        event.preventDefault();
        // Update the user cursor position on every pointer move
        updateMyPresence({
          cursor: {
            x: Math.round(event.clientX),
            y: Math.round(event.clientY),
          },
        });
      }}
      onPointerLeave={() =>
        // When the pointer goes out, set cursor to null
        updateMyPresence({
          cursor: null,
        })
      }
    >
      <header>
        <Status />
        <LiveAvatars />
      </header>

      <p>
        Try putting your web browser in "offline mode" mode to simulate losing a
        connection. By default, Liveblocks automatically tries to reconnect
        after 5 seconds. You can override the <code>lostConnectionTimeout</code>{" "}
        in <code>createClient()</code>.
      </p>
      {
        /**
         * Iterate over other users and display a cursor based on their presence
         */
        others.map(({ connectionId, presence }) => {
          if (presence.cursor === null) {
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
      <LostConnectionToasts />
    </div>
  );
}
