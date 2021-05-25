import { RoomProvider } from "@liveblocks/react";
import React from "react";
import Cursor from "../src/Cursor";
import useWindowLiveCursors from "../src/useWindowLiveCursors";

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

type Presence = {
  cursor: { x: number; y: number };
  message?: string;
};

export default function Root() {
  return (
    <RoomProvider id="example-window-live-cursors">
      <Demo />
    </RoomProvider>
  );
}

function Demo() {
  const cursors = useWindowLiveCursors<Presence>();

  return (
    <>
      <main>
        <div className="flex justify-center items-center h-screen select-none">
          <div className="text-center max-w-sm">
            <h1 className="text-xl">Live Cursors Scrollable</h1>
            <p className="text-sm mt-1 text-gray-600">
              Open this page in multiple browsers to see the live cursors as you
              scroll down the page.
            </p>
          </div>
        </div>
        <div className="flex justify-center items-center h-screen select-none">
          <div className="text-center max-w-sm">
            <p className="text-sm mt-1 text-gray-600">Keep scrolling…</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-screen select-none">
          <div className="text-center max-w-sm">
            <p className="text-sm mt-1 text-gray-600">
              This is the end of the page
            </p>
          </div>
        </div>
      </main>
      {cursors.map(({ x, y, connectionId }) => (
        <Cursor
          key={connectionId}
          color={COLORS[connectionId % COLORS.length]}
          x={x}
          y={y}
        />
      ))}
    </>
  );
}
