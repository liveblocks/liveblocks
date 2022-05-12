import styles from "./Card.module.css";
import { useUpdateMyPresence, useOthers } from "@liveblocks/react";
import { useEffect, useRef, useState } from "react";
import { COLORS_PRESENCE } from "../constants";
import Cursor from "./Cursor";

function getCursorPositionFromBoundingRect(e, boundingRect) {
  return {
    x: (e.clientX - boundingRect.left) / boundingRect.width,
    y: (e.clientY - boundingRect.top) / boundingRect.height,
  };
}

export default function Card({ id, children }) {
  const containerRef = useRef();
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const [boundingRect, setBoundingRect] = useState(null);

  useEffect(() => {
    if (containerRef.current) {
      setBoundingRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseEnter={() => {
        updateMyPresence({
          cardId: id,
        });
        setBoundingRect(containerRef.current.getBoundingClientRect());
      }}
      onMouseMove={(e) => {
        if (!boundingRect) {
          return;
        }

        const cursor = getCursorPositionFromBoundingRect(e, boundingRect);

        updateMyPresence({
          cursor,
        });
      }}
      onMouseLeave={() => {
        updateMyPresence({
          cardId: null,
          cursor: null,
        });
      }}
    >
      {children}

      {others.map(({ connectionId, presence }) => {
        if (
          boundingRect == null ||
          presence == null ||
          presence.cursor == null ||
          presence.cardId == null ||
          presence.cardId !== id
        ) {
          return null;
        }

        return (
          <Cursor
            key={`cursor-${connectionId}`}
            color={`rgb(${
              COLORS_PRESENCE[connectionId % COLORS_PRESENCE.length]
            }`}
            x={presence.cursor.x * boundingRect.width}
            y={presence.cursor.y * boundingRect.height}
          />
        );
      })}
    </div>
  );
}
