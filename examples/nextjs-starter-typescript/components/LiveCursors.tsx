import { useOthers, useUpdateMyPresence } from "@liveblocks/react";
import React, { MutableRefObject, useEffect } from "react";
import Cursor from "./Cursor";
import { useBoundingClientRectRef } from "../utils/useBoundingClientRectRef";

type Props = {
  // The element that's used for pointer events and scroll position
  cursorPanel: MutableRefObject<HTMLElement | null>;
};

/**
 * This file shows you how to create a reusable live cursors component for your product.
 * The component takes a reference to another element ref `cursorPanel` and renders
 * cursors according to the location and scroll position of this panel.
 * Make sure that cursorPanel has a CSS position set, and that LiveCursors is placed inside
 */
export default function LiveCursors({ cursorPanel }: Props) {
  /**
   * useMyPresence returns a function to update  the current user's presence.
   * updateMyPresence is different to the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   * See https://liveblocks.io/docs/api-reference/liveblocks-react#useUpdateMyPresence for more information
   */
  const updateMyPresence = useUpdateMyPresence();

  /**
   * Return all the other users in the room and their presence (a cursor position in this case)
   */
  const others = useOthers();
  const rectRef = useBoundingClientRectRef(cursorPanel);

  useEffect(() => {
    if (!(cursorPanel?.current instanceof HTMLElement)) {
      console.warn(
        'Pass `ref` containing HTMLElement to `<LiveCursors scrollRef=""`.'
      );
      return;
    }

    // If cursorPanel, add live cursor listeners
    const updateCursor = (event: PointerEvent) => {
      if (!cursorPanel?.current) {
        return;
      }

      // (Viewport position) - (element position) + (element scroll amount)
      const x =
        event.clientX - rectRef.current.x + cursorPanel.current.scrollLeft;
      const y =
        event.clientY - rectRef.current.y + cursorPanel.current.scrollTop;

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

    // Clean up event listeners
    const oldRef = cursorPanel.current;
    return () => {
      if (!oldRef) {
        return;
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
