import { useOthers, useUpdateMyPresence } from "@liveblocks/react";
import { useEffect } from "react";

export default function useWindowLiveCursors<
  TPresence extends { cursor: { x: number; y: number } | null }
>() {
  const updateMyPresence = useUpdateMyPresence<TPresence>();

  useEffect(() => {
    let scroll = {
      x: window.scrollX,
      y: window.scrollY,
    };

    let lastPosition: { x: number; y: number } | null = null;

    function percentagePosition(point: { x: number; y: number }) {
      return {
        x: point.x / window.innerWidth,
        y: point.y / window.innerHeight,
      };
    }

    function onPointerMove(event: PointerEvent) {
      const position = {
        x: event.pageX,
        y: event.pageY,
      };
      lastPosition = position;
      updateMyPresence({
        cursor: percentagePosition(position),
      } as TPresence);
    }

    function onPointerLeave() {
      lastPosition = null;
      updateMyPresence({ cursor: null } as TPresence);
    }

    function onDocumentScroll() {
      if (lastPosition) {
        const offsetX = window.scrollX - scroll.x;
        const offsetY = window.scrollY - scroll.y;
        const position = {
          x: lastPosition.x + offsetX,
          y: lastPosition.y + offsetY,
        };
        lastPosition = position;
        updateMyPresence({
          cursor: percentagePosition(position),
        } as TPresence);
      }
      scroll.x = window.scrollX;
      scroll.y = window.scrollY;
    }

    document.addEventListener("scroll", onDocumentScroll);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      document.removeEventListener("scroll", onDocumentScroll);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [updateMyPresence]);

  const others = useOthers<TPresence>();

  return others
    .toArray()
    .filter((user) => user.presence?.cursor != null)
    .map(({ connectionId, presence, id, info }) => {
      return {
        x: presence!.cursor!.x * window.innerWidth,
        y: presence!.cursor!.y * window.innerHeight,
        connectionId,
        id,
        info,
        presence,
      };
    });
}
