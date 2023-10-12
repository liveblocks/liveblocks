"use client";

import { useEffect, useState } from "react";
import * as Portal from "@radix-ui/react-portal";
import styles from "./NewThreadCursor.module.css";

export function NewThreadCursor({ display }: { display: boolean }) {
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

  useEffect(() => {
    if (display) {
      document.documentElement.classList.add("hide-cursor");
    } else {
      document.documentElement.classList.remove("hide-cursor");
    }
  }, [display]);

  if (!display) {
    return null;
  }

  return (
    <Portal.Root>
      <div
        className={styles.newThreadCursor}
        style={{
          transform: `translate(${coords.x}px, ${coords.y}px)`,
        }}
      />
    </Portal.Root>
  );
}
