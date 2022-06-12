import React, { useOthers, useUpdateMyPresence, } from "@liveblocks/react";
import { MutableRefObject, useEffect, useRef } from "react";
import Cursor from "./Cursor";

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
  scrollRef: MutableRefObject<HTMLElement | null>;
};

export default function LiveCursors({ scrollRef }: Props) {
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

  const rect = useRef({ x: 0, y: 0 });

  useEffect(() => {
    /* === Update bounding rect on window change ========== */
    const updateRect = () => {
      if (!scrollRef?.current) {
        return;
      }
      rect.current = scrollRef.current.getBoundingClientRect();
    };

    window.addEventListener("resize", updateRect);
    window.addEventListener("orientationchange", updateRect);
    updateRect();

    if (!(scrollRef?.current instanceof HTMLElement)) {
      console.warn("Pass `ref` containing HTMLElement to `<LiveCursors scrollRef=\"\"`.");
      return;
    }

    /* === If scrollRef, add live cursor listeners ========== */
    const updateCursor = (event: PointerEvent) => {
      if (!scrollRef?.current) {
        return;
      }

      // (Viewport position) - (element position) + (element scroll amount)
      const x = event.clientX - rect.current.x + scrollRef.current.scrollLeft;
      const y = event.clientY - rect.current.y + scrollRef.current.scrollTop;

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

    scrollRef.current.addEventListener("pointermove", updateCursor);
    scrollRef.current.addEventListener("pointerleave", removeCursor);

    /* === Clean up event listeners ========== */
    const oldRef = scrollRef.current;
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("orientationchange", updateRect);
      if (!oldRef) {
        return
      }
      oldRef.removeEventListener("pointermove", updateCursor);
      oldRef.removeEventListener("pointerleave", removeCursor);
    };
  }, [updateMyPresence, scrollRef]);

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
