import { useCallback, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";

export function useClosestThreePointerEvent(
  onEvent: (event: ThreeEvent<PointerEvent>) => void
) {
  const events = useRef<ThreeEvent<PointerEvent>[]>([]);

  const collectEvent = useCallback((event: ThreeEvent<PointerEvent>) => {
    events.current.push(event);
  }, []);

  useFrame(() => {
    if (events.current.length > 0) {
      // Find the closest one to the camera
      const closestPointerMove = events.current.reduce(
        (closestPointerMove, intersection) => {
          return intersection.distance < closestPointerMove.distance
            ? intersection
            : closestPointerMove;
        }
      );

      onEvent(closestPointerMove);

      // Clear the events before the next frame
      events.current.length = 0;
    }
  });

  return collectEvent;
}
