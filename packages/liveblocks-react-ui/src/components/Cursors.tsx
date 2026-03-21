import type { EventSource } from "@liveblocks/core";
import { isPlainObject, makeEventSource } from "@liveblocks/core";
import {
  useOther,
  useOthersConnectionIds,
  useRoom,
  useUpdateMyPresence,
  useUser,
} from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import type {
  ComponentPropsWithoutRef,
  MutableRefObject,
  PointerEvent,
} from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "../utils/cn";
import { makeCursorSpring } from "../utils/cursor-spring";
import { useRefs } from "../utils/use-refs";
import { useWindowFocus } from "../utils/use-window-focus";
import { Cursor } from "./Cursor";

const DEFAULT_PRESENCE_KEY = "cursor";

export interface CursorsProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The key used to store the cursors in users' Presence.
   * This can be used to have multiple `Cursors` in a single room.
   *
   * Defaults to `"cursor"`.
   */
  presenceKey?: string;
}

type Coordinates = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
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

function PresenceCursor({
  connectionId,
  presenceKey,
  sizeRef,
  sizeEvents,
}: {
  connectionId: number;
  presenceKey: string;
  sizeRef: MutableRefObject<Size | null>;
  sizeEvents: EventSource<void>;
}) {
  const room = useRoom();
  const cursorRef = useRef<HTMLDivElement>(null);
  const userId = useOther(connectionId, (other) => $string(other.id));
  const { user, isLoading } = useUser(userId ?? "");
  const hasUserInfo = userId !== undefined && !isLoading;
  const color = $string(user?.color);
  const name = $string(user?.name);

  useLayoutEffect(() => {
    const spring = makeCursorSpring();

    function update() {
      const element = cursorRef.current;
      const coordinates = spring.get();

      if (!element) {
        return;
      }

      if (!hasUserInfo || coordinates === null) {
        element.style.transform = "translate3d(0, 0, 0)";
        element.style.display = "none";
        return;
      }

      if (sizeRef.current) {
        element.style.transform = `translate3d(${coordinates.x * sizeRef.current.width}px, ${coordinates.y * sizeRef.current.height}px, 0)`;
      }

      element.style.display = "";
    }

    const unsubscribeSpring = spring.subscribe(update);
    const unsubscribeSize = sizeEvents.subscribe(update);
    update();

    const unsubscribeOther = room.events.others.subscribe(({ others }) => {
      const other = others.find((other) => other.connectionId === connectionId);
      const cursor = $coordinates(other?.presence[presenceKey]);

      spring.set(cursor ?? null);
    });

    return () => {
      spring.dispose();
      unsubscribeSpring();
      unsubscribeSize();
      unsubscribeOther();
    };
  }, [room, connectionId, presenceKey, sizeRef, sizeEvents, hasUserInfo]);

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
  (
    { className, children, presenceKey = DEFAULT_PRESENCE_KEY, ...props },
    forwardedRef
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mergedRefs = useRefs(forwardedRef, containerRef);
    const updateMyPresence = useUpdateMyPresence();
    const othersConnectionIds = useOthersConnectionIds();
    const sizeRef = useRef<Size | null>(null);
    const [sizeEvents] = useState(() => makeEventSource<void>());
    const isWindowFocused = useWindowFocus();

    useEffect(() => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      function setSize(size: Size) {
        sizeRef.current = size;
        sizeEvents.notify();
      }

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === container) {
            setSize({
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
          }
        }
      });

      setSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });

      observer.observe(container);

      return () => {
        observer.disconnect();
      };
    }, [sizeEvents]);

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        const container = containerRef.current;

        if (!container) {
          return;
        }

        const bounds = container.getBoundingClientRect();

        if (bounds.width === 0 || bounds.height === 0) {
          return;
        }

        updateMyPresence({
          [presenceKey]: {
            x: (event.clientX - bounds.left) / bounds.width,
            y: (event.clientY - bounds.top) / bounds.height,
          },
        });
      },
      [updateMyPresence, presenceKey]
    );

    const handlePointerLeave = useCallback(() => {
      updateMyPresence({
        [presenceKey]: null,
      });
    }, [updateMyPresence, presenceKey]);

    useEffect(() => {
      if (!isWindowFocused) {
        updateMyPresence({
          [presenceKey]: null,
        });
      }
    }, [isWindowFocused, updateMyPresence, presenceKey]);

    return (
      <div
        className={cn("lb-root lb-cursors", className)}
        {...props}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        ref={mergedRefs}
      >
        <div className="lb-cursors-container">
          {othersConnectionIds.map((connectionId) => (
            <PresenceCursor
              key={connectionId}
              connectionId={connectionId}
              presenceKey={presenceKey}
              sizeRef={sizeRef}
              sizeEvents={sizeEvents}
            />
          ))}
        </div>

        {children}
      </div>
    );
  }
);
