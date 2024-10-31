import { useEffect } from "react";

export function useMouseListener(callback: (mouse: "up" | "down") => void) {
  useEffect(() => {
    const onMouseDown = () => callback("down");
    const onMouseUp = () => callback("up");

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [callback]);
}
