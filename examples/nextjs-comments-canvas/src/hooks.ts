import { useMemo, useState, useCallback, useLayoutEffect } from "react";
import { useThreads } from "@liveblocks/react/suspense";

// The z-index of the highest thread
export function useMaxZIndex() {
  const { threads } = useThreads();

  return useMemo(() => {
    let max = 0;
    for (const thread of threads) {
      if (thread.metadata.zIndex > max) {
        max = thread.metadata.zIndex;
      }
    }
    return max;
  }, [threads]);
}

// Check if near edge of screen
export function useNearEdge(ref: React.RefObject<HTMLElement>) {
  const [nearRightEdge, setNearRightEdge] = useState(false);
  const [nearBottomEdge, setNearBottomEdge] = useState(false);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();

      // Within 400px of right side of screen (i.e. too little space for a thread)
      // 260px is sidebar width
      const nearRight = rect.left >= window.innerWidth - 320 - 260;

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
