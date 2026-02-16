import {
  shallow,
  useOther,
  useOthersConnectionIds,
  useUpdateMyPresence,
} from "@liveblocks/react";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type PointerEvent,
  useCallback,
  useId,
} from "react";

import { cn } from "../utils/cn";
import { Cursor } from "./Cursor";

export type CursorsProps = ComponentPropsWithoutRef<"div">;

function string(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

type CursorPresence = {
  x: number;
  y: number;
};

function ConnectionIdCursor({
  connectionId,
  cursorPresenceKey,
}: {
  connectionId: number;
  cursorPresenceKey: string;
}) {
  const color = useOther(connectionId, (other) => string(other.info?.color));
  const name = useOther(connectionId, (other) => string(other.info?.name));
  const cursor = useOther(
    connectionId,
    (other) => other.presence[cursorPresenceKey] as CursorPresence | null,
    shallow
  );

  if (!cursor) {
    return null;
  }

  return (
    <Cursor
      color={color}
      label={name}
      style={{
        transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
      }}
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
            <ConnectionIdCursor
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
