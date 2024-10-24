import { useOthers, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { MutableRefObject, useEffect } from "react";
import { Cursor } from "./Cursor";

interface Props {
  // The element that's used for pointer events and scroll position
  element: MutableRefObject<HTMLElement | null>;
}

/**
 * This file shows you how to create a reusable live cursors component for your product.
 * The component takes a reference to another element ref `element` and renders
 * cursors according to the location and scroll position of this panel.
 */
export function Cursors({ element }: Props) {
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

  useEffect(() => {
    if (!element.current) {
      return;
    }

    // If element, add live cursor listeners
    const updateCursor = (event: PointerEvent) => {
      if (!element?.current) {
        return;
      }

      const { top, left } = element.current.getBoundingClientRect();

      const x = event.clientX - left + element.current.scrollLeft;
      const y = event.clientY - top + element.current.scrollTop;

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

    element.current.addEventListener("pointermove", updateCursor);
    element.current.addEventListener("pointerleave", removeCursor);

    // Clean up event listeners
    const oldRef = element.current;
    return () => {
      if (!oldRef) {
        return;
      }
      oldRef.removeEventListener("pointermove", updateCursor);
      oldRef.removeEventListener("pointerleave", removeCursor);
    };
  }, [updateMyPresence, element]);

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
              color={info?.color}
              key={`cursor-${connectionId}`}
              // connectionId is an integer that is incremented at every new connections
              // Assigning a color with a modulo makes sure that a specific user has the same colors on every clients
              name={info?.name}
              x={presence.cursor.x}
              y={presence.cursor.y}
            />
          );
        })
      }
    </>
  );
}
