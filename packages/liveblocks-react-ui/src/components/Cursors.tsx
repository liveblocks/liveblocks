import { isPlainObject, makeEventSource } from "@liveblocks/core";
import {
  useOther,
  useOthersConnectionIds,
  useRoom,
  useUpdateMyPresence,
} from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type PointerEvent,
  useCallback,
  useId,
  useRef,
} from "react";

import type { Animatable } from "../utils/animation-loop";
import { makeAnimationLoop } from "../utils/animation-loop";
import { cn } from "../utils/cn";
import { Cursor } from "./Cursor";

const STIFFNESS = 320;
const DAMPING = 32;
const EPSILON = 0.01;

export type CursorsProps = ComponentPropsWithoutRef<"div">;

type Coordinates = {
  x: number;
  y: number;
};

function $string(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function $coordinates(value: unknown): Coordinates | undefined {
  if (
    isPlainObject(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  ) {
    return value as Coordinates;
  }

  return undefined;
}

// Use a shared animation loop for all (active) springs.
const loop = makeAnimationLoop();

function makeCoordinatesSpring() {
  const updates = makeEventSource<Coordinates | null>();
  let value: Coordinates | null = null;
  let target: Coordinates | null = null;
  const velocity = { x: 0, y: 0 };

  const spring: Animatable = {
    active: false,
    step(dt: number) {
      if (value === null || target === null) {
        spring.active = false;
        return;
      }

      const k = STIFFNESS;
      const d = DAMPING;
      const dx = value.x - target.x;
      const dy = value.y - target.y;

      velocity.x += (-k * dx - d * velocity.x) * dt;
      velocity.y += (-k * dy - d * velocity.y) * dt;

      const nx = value.x + velocity.x * dt;
      const ny = value.y + velocity.y * dt;

      if (nx !== value.x || ny !== value.y) {
        value.x = nx;
        value.y = ny;
        updates.notify(value);
      }

      if (
        Math.abs(velocity.x) < EPSILON &&
        Math.abs(velocity.y) < EPSILON &&
        Math.abs(target.x - value.x) < EPSILON &&
        Math.abs(target.y - value.y) < EPSILON
      ) {
        if (value.x !== target.x || value.y !== target.y) {
          value.x = target.x;
          value.y = target.y;
          updates.notify(value);
        }

        velocity.x = 0;
        velocity.y = 0;
        spring.active = false;
      }
    },
  };

  return {
    set(point: Coordinates | null) {
      if (point === null) {
        value = null;
        target = null;
        velocity.x = 0;
        velocity.y = 0;
        spring.active = false;
        loop.remove(spring);
        updates.notify(null);
        return;
      }

      if (value === null) {
        value = { x: point.x, y: point.y };
        target = point;
        velocity.x = 0;
        velocity.y = 0;
        updates.notify(value);
        return;
      }

      target = point;

      if (!spring.active && (value.x !== target.x || value.y !== target.y)) {
        spring.active = true;
        loop.add(spring);
      }
    },
    subscribe: updates.subscribe,
    dispose() {
      spring.active = false;
      loop.remove(spring);
      updates.dispose();
    },
  };
}

function PresenceCursor({
  connectionId,
  cursorPresenceKey,
}: {
  connectionId: number;
  cursorPresenceKey: string;
}) {
  const room = useRoom();
  const cursorRef = useRef<HTMLDivElement>(null);
  const color = useOther(connectionId, (other) => $string(other.info?.color));
  const name = useOther(connectionId, (other) => $string(other.info?.name));

  useLayoutEffect(() => {
    const spring = makeCoordinatesSpring();

    spring.subscribe((coordinates) => {
      const element = cursorRef.current;

      if (!element) {
        return;
      }

      if (coordinates === null) {
        element.style.transform = "translate3d(0, 0, 0)";
        element.style.display = "none";
      } else {
        element.style.transform = `translate3d(${coordinates.x}px, ${coordinates.y}px, 0)`;
        element.style.display = "";
      }
    });

    const unsubscribeOther = room.events.others.subscribe(({ others }) => {
      const other = others.find((other) => other.connectionId === connectionId);
      const cursor = $coordinates(other?.presence[cursorPresenceKey]);

      spring.set(cursor ?? null);
    });

    return () => {
      spring.dispose();
      unsubscribeOther();
    };
  }, [room, connectionId, cursorPresenceKey]);

  return (
    <Cursor
      color={color}
      label={name}
      ref={cursorRef}
      style={{ display: "none" }}
    />
  );
}

/**
 * Displays multiplayer cursors.
 */
export const Cursors = forwardRef<HTMLDivElement, CursorsProps>(
  ({ className, children, ...props }, forwardedRef) => {
    const id = useId();
    const cursorPresenceKey = `cursors:${id}`;
    const updateMyPresence = useUpdateMyPresence();
    const othersConnectionIds = useOthersConnectionIds();

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        const bounds = event.currentTarget.getBoundingClientRect();

        updateMyPresence({
          [cursorPresenceKey]: {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
        });
      },
      [updateMyPresence, cursorPresenceKey]
    );

    const handlePointerLeave = useCallback(() => {
      updateMyPresence({
        [cursorPresenceKey]: null,
      });
    }, [updateMyPresence, cursorPresenceKey]);

    return (
      <div
        className={cn("lb-root lb-cursors", className)}
        {...props}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        ref={forwardedRef}
      >
        <div className="lb-cursors-container">
          {othersConnectionIds.map((connectionId) => (
            <PresenceCursor
              key={connectionId}
              connectionId={connectionId}
              cursorPresenceKey={cursorPresenceKey}
            />
          ))}
        </div>

        {children}
      </div>
    );
  }
);
