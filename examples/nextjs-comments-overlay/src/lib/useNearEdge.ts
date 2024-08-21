import { useState, useEffect, useCallback } from "react";

export function useNearEdge(ref: React.RefObject<HTMLElement>) {
  const [nearRightEdge, setNearRightEdge] = useState(false);
  const [nearBottomEdge, setNearBottomEdge] = useState(false);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const nearRight = window.innerWidth - rect.right <= 300;
      const nearBottom = window.innerHeight - rect.bottom <= 300;

      setNearRightEdge(nearRight);
      setNearBottomEdge(nearBottom);
    }
  }, []);

  useEffect(() => {
    updatePosition();

    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [ref]);

  return { nearRightEdge, nearBottomEdge, updatePosition };
}
