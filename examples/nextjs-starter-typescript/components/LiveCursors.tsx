import React, { useOthers, useUpdateMyPresence, } from "@liveblocks/react";
import { MutableRefObject, useEffect } from "react";
import Cursor from "./Cursor";
import { useBoundingClientRectRef } from "../utils/useBoundingClientRectRef";

/**
 * This file shows how to add basic live cursors on your product.
 */

type Cursor = {
  x: number;
  y: number;
};

type Presence = {
  cursor: Cursor | null;
};

type Props = {
  // The element that's used for pointer events and scroll position
  cursorPanel: MutableRefObject<HTMLElement | null>;
};

/**
 * Make sure that cursorPanel has a CSS position set, and that LiveCursors is placed inside
 */
export default function LiveCursors({ cursorPanel }: Props) {
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
  const rectRef = useBoundingClientRectRef(cursorPanel);

  useEffect(() => {
    if (!(cursorPanel?.current instanceof HTMLElement)) {
      console.warn("Pass `ref` containing HTMLElement to `<LiveCursors scrollRef=\"\"`.");
      return;
    }

    /* === If cursorPanel, add live cursor listeners ========== */
    const updateCursor = (event: PointerEvent) => {
      if (!cursorPanel?.current) {
        return;
      }

      // (Viewport position) - (element position) + (element scroll amount)
      const x = event.clientX - rectRef.current.x + cursorPanel.current.scrollLeft;
      const y = event.clientY - rectRef.current.y + cursorPanel.current.scrollTop;

      updateMyPresence({
        cursor: {
          x: Math.round(x),
          y: Math.round(y),
        },
      });
    };

    const removeCursor = () => {
      updateMyPresence({
        cursor: null,
      });
    };

    cursorPanel.current.addEventListener("pointermove", updateCursor);
    cursorPanel.current.addEventListener("pointerleave", removeCursor);

    /* === Clean up event listeners ========== */
    const oldRef = cursorPanel.current;
    return () => {
      if (!oldRef) {
        return
      }
      oldRef.removeEventListener("pointermove", updateCursor);
      oldRef.removeEventListener("pointerleave", removeCursor);
    };
  }, [updateMyPresence, cursorPanel]);

  return (
    <>
      {
        /**
         * Iterate over other users and display a cursor based on their presence
         */
        others.map(({ connectionId, presence, info }) => {
          if (presence == null || presence.cursor == null) {
            return null;
          }

          return (
            <Cursor
              variant="name"
              name={info?.name}
              key={`cursor-${connectionId}`}
              // connectionId is an integer that is incremented at every new connections
              // Assigning a color with a modulo makes sure that a specific user has the same colors on every clients
              color={info?.color}
              x={presence.cursor.x}
              y={presence.cursor.y}
            />
          );
        })
      }
    </>
  );
}
