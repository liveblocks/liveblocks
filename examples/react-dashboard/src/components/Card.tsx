import styles from "./Card.module.css";
import { useUpdateMyPresence, useOthers } from "../liveblocks.config";
import { useEffect, useRef, useState } from "react";
import { COLORS_PRESENCE } from "../constants";
import Cursor from "./Cursor";

type Props = {
  id: string;
  children: React.ReactNode;
};

type Presence = {
  cursor: CursorPosition | null;
  cardId: string | null;
}

type BoundingRect = {
  left: number;
  top: number;
  width: number;
  height: number;
}

type CursorPosition = {
  x: number;
  y: number;
}

function getCursorPositionFromBoundingRect(
  e: MouseEvent, 
  boundingRect: BoundingRect
): CursorPosition {
  return {
    x: (e.clientX - boundingRect.left) / boundingRect.width,
    y: (e.clientY - boundingRect.top) / boundingRect.height,
  };
}

export default function Card({ id, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  // const others = useOthers<{ presence: Presence }>( );
  const [boundingRect, setBoundingRect] = useState<BoundingRect | null>(null);
  const [myPresence, setMyPresence] = useState<Presence>({
    cursor: null,
    cardId: null,
  });

  useEffect(() => {
    if (containerRef.current) {
      setBoundingRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onPointerEnter={() => {
        updateMyPresence({
          cardId: id,
        });
        setBoundingRect(containerRef.current?.getBoundingClientRect() ?? null);
        // setBoundingRect(containerRef.current?.getBoundingClientRect()??null);  
      }}
      onPointerMove={(e) => {
        e.preventDefault();

        if (!boundingRect) {
          return;
        }

        const cursor = {
          x: (e.clientX - boundingRect.left) / boundingRect.width,
          y: (e.clientY - boundingRect.top) / boundingRect.height,
        };

        updateMyPresence({
          cursor,
        });
      }}
      onPointerLeave={() => {
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
            x={(presence.cursor as CursorPosition).x * boundingRect.width}
            y={(presence.cursor as CursorPosition).y * boundingRect.height}
          />
        );
      })}
    </div>
  );
}
