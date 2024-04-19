import { useEffect, useState } from "react";
import styles from "./NewThreadCursor.module.css";

export function NewThreadCursor() {
  const [coords, setCoords] = useState({
    x: -10000,
    y: -10000,
  });

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setCoords({
        x: e.clientX,
        y: e.clientY,
      });
    };

    document.addEventListener("mousemove", updatePosition, false);
    document.addEventListener("mouseenter", updatePosition, false);

    return () => {
      document.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("mouseenter", updatePosition);
    };
  }, []);

  return (
    <div
      className={styles.newThreadCursor}
      style={{
        transform: `translate(${coords.x}px, ${coords.y}px)`,
        zIndex: 99999999999,
      }}
    />
  );
}
