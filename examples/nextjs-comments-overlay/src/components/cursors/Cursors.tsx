"use client";

import { Cursor } from "./Cursor";
import { useEffect } from "react";
import { getCoordsFromElement } from "@/lib/coords";
import {
  useOthersConnectionIds,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";

export function Cursors() {
  return (
    <ClientSideSuspense fallback={null}>
      <CursorsComponent />
    </ClientSideSuspense>
  );
}

function CursorsComponent() {
  /**
   * useMyPresence returns the presence of the current user and a function to update it.
   * updateMyPresence is different than the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   * See https://liveblocks.io/docs/api-reference/liveblocks-react#useMyPresence for more information
   */
  const updateMyPresence = useUpdateMyPresence();

  /**
   * Return all the other users in the room and their presence (a cursor position in this case)
   */
  const othersConnectionIds = useOthersConnectionIds();

  useEffect(() => {
    // On cursor move, update presence
    function handlePointerMove(e: PointerEvent) {
      const elementUnder = document.elementFromPoint(e.clientX, e.clientY);

      if (elementUnder) {
        const cursor = getCoordsFromElement(elementUnder, e.clientX, e.clientY);
        updateMyPresence({ cursor });
      } else {
        updateMyPresence({ cursor: null });
      }
    }

    // Hide cursor on leave page
    function handlePointerLeave() {
      updateMyPresence({ cursor: null });
    }

    document.documentElement.addEventListener("pointermove", handlePointerMove);
    document.documentElement.addEventListener(
      "pointerleave",
      handlePointerLeave
    );

    return () => {
      document.documentElement.removeEventListener(
        "pointermove",
        handlePointerMove
      );
      document.documentElement.removeEventListener(
        "pointerleave",
        handlePointerLeave
      );
    };
  }, [updateMyPresence]);

  // Iterate through currently connected users and pass unique `connectionId` to `Cursor`
  return (
    <>
      {othersConnectionIds.map((connectionId) => (
        <Cursor key={connectionId} connectionId={connectionId} />
      ))}
    </>
  );
}
