import { shallow } from "@liveblocks/react";
import {
  useOthersMapped,
  useUpdateMyPresence,
} from "../liveblocks.real.config";
import React, { MutableRefObject, useEffect, useRef } from "react";
import Cursor from "./Cursor";

type Props = {
  // The element that's used for pointer events and scroll position
  cursorPanel: MutableRefObject<HTMLElement | null>;
};

export default function Cursors({ cursorPanel }: Props) {
  const updateMyPresence = useUpdateMyPresence();

  const others = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      info: other.info,
    }),
    shallow
  );
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
      {others.map(([id, other]) => {
        if (other.cursor == null) {
          return null;
        }

        return (
          <Cursor
            key={id}
            color={["red", "blue"]}
            x={other.cursor.x}
            y={other.cursor.y}
            avatar={`https://liveblocks.io/avatars/avatar-${Math.floor(
              id % 30
            )}.png`}
          />
        );
      })}
    </>
  );
}

const initialRect = {
  x: 0,
  y: 0,
  height: 0,
  width: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: () => "",
};

/**
 * Returns a ref containing the results of `getBoundingClientRect` for `ref`
 * Updates on window changes
 */
export function useBoundingClientRectRef(
  ref: MutableRefObject<Element | null>
) {
  const rectRef = useRef<DOMRect>(initialRect);

  useEffect(() => {
    const updateRect = () => {
      if (!(ref?.current instanceof Element)) {
        return;
      }
      rectRef.current = ref.current.getBoundingClientRect();
    };

    window.addEventListener("resize", updateRect);
    window.addEventListener("orientationchange", updateRect);
    updateRect();

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("orientationchange", updateRect);
    };
  }, [ref]);

  return rectRef;
}
