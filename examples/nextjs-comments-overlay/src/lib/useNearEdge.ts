import { useState, useEffect, useCallback } from "react";

const HORIZONTAL_DISTANCE = 370;
const VERTICAL_DISTANCE = 350;

export function useNearEdge(ref: React.RefObject<HTMLElement>) {
  const [nearRightEdge, setNearRightEdge] = useState(false);
  const [nearBottomEdge, setNearBottomEdge] = useState(false);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const nearRight = rect.left >= window.innerWidth - HORIZONTAL_DISTANCE;
      const nearBottom = rect.top >= window.innerHeight - VERTICAL_DISTANCE;

      setNearRightEdge(nearRight);
      setNearBottomEdge(nearBottom);
    }
  }, []);

  useEffect(() => {
    updatePosition();
    setTimeout(updatePosition);

    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [ref]);

  return { nearRightEdge, nearBottomEdge, updatePosition };
}
