import { useState, useCallback, useLayoutEffect } from "react";

export function useNearEdge(ref: React.RefObject<HTMLElement>) {
  const [nearRightEdge, setNearRightEdge] = useState(false);
  const [nearBottomEdge, setNearBottomEdge] = useState(false);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();

      // Within 400px of right side of screen (i.e. too little space for a thread)
      const nearRight = rect.left >= window.innerWidth - 400;

      // In bottom half of screen
      const nearBottom = rect.top >= window.innerHeight / 2;

      setNearRightEdge(nearRight);
      setNearBottomEdge(nearBottom);
    }
  }, []);

  useLayoutEffect(() => {
    updatePosition();

    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousemove", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousemove", updatePosition);
    };
  }, [ref.current]);

  return { nearRightEdge, nearBottomEdge };
}
