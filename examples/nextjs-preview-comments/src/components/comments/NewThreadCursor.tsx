import { useEffect, useState } from "react";
import * as Portal from "@radix-ui/react-portal";
import { Pointer, POINTER_OFFSET } from "./Pointer";
import styles from "./NewThreadCursor.module.css";
import stylesOverlay from "./Overlay.module.css";
import { PlusCircleIcon } from "@/components/icons/PlusCircleIcon";

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
          transform: `translate(${coords.x + POINTER_OFFSET.x}px, ${
            coords.y + POINTER_OFFSET.y
          }px)`,
        }}
      >
        <Pointer />
        <div className={stylesOverlay.minimizedThread}>
          <PlusCircleIcon opacity="0.7" />
          <div>New thread</div>
        </div>
      </div>
    </Portal.Root>
  );
}
