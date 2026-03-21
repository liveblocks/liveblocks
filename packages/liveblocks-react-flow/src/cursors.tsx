import { isPlainObject } from "@liveblocks/core";
import {
  useOther,
  useOthersConnectionIds,
  useRoom,
  useUpdateMyPresence,
  useUser,
} from "@liveblocks/react";
import { useLayoutEffect } from "@liveblocks/react/_private";
import { Cursor } from "@liveblocks/react-ui";
import { cn, makeCursorSpring } from "@liveblocks/react-ui/_private";
import { useReactFlow, useStore, useStoreApi } from "@xyflow/react";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useCallback, useEffect, useRef } from "react";

const DEFAULT_PRESENCE_KEY = "cursor";

export interface CursorsProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The key used to store the cursors in users' Presence.
   *
   * Defaults to `"cursor"`.
   */
  presenceKey?: string;
}

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

function PresenceCursor({
  connectionId,
  presenceKey,
}: {
  connectionId: number;
  presenceKey: string;
}) {
  const room = useRoom();
  const cursorRef = useRef<HTMLDivElement>(null);
  const reactFlowStoreApi = useStoreApi();
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
      const [panX, panY, zoom] = reactFlowStoreApi.getState().transform;

      if (!element) {
        return;
      }

      if (!hasUserInfo || coordinates === null) {
        element.style.transform = "translate3d(0, 0, 0)";
        element.style.display = "none";
        return;
      }

      element.style.transform = `translate3d(${coordinates.x * zoom + panX}px, ${coordinates.y * zoom + panY}px, 0)`;
      element.style.display = "";
    }

    update();

    const unsubscribeSpring = spring.subscribe(update);
    const unsubscribeTransform = reactFlowStoreApi.subscribe(
      (state, previousState) => {
        // Update positions whenever the canvas is panned or zoomed.
        if (state.transform !== previousState.transform) {
          update();
        }
      }
    );
    const unsubscribeOther = room.events.others.subscribe(({ others }) => {
      const other = others.find((other) => other.connectionId === connectionId);
      const cursor = $coordinates(other?.presence[presenceKey]);

      spring.set(cursor ?? null);
    });

    return () => {
      spring.dispose();
      unsubscribeSpring();
      unsubscribeTransform();
      unsubscribeOther();
    };
  }, [room, connectionId, presenceKey, hasUserInfo, reactFlowStoreApi]);

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
 * Displays other users' cursors inside a React Flow canvas and stores the
 * current user's cursor in Presence as `{ cursor: { x, y } }`.
 *
 * Cursor coordinates are kept in React Flow canvas space, so panning moves
 * them correctly while zooming only affects their position, not their size.
 */
export const Cursors = forwardRef<HTMLDivElement, CursorsProps>(
  (
    { className, children, presenceKey = DEFAULT_PRESENCE_KEY, ...props },
    forwardedRef
  ) => {
    const reactFlow = useReactFlow();
    const updateMyPresence = useUpdateMyPresence();
    const othersConnectionIds = useOthersConnectionIds();
    const reactFlowDomNode = useStore((state) => state.domNode);
    const reactFlowStoreApi = useStoreApi();

    const handlePointerMove = useCallback(
      (event: PointerEvent) => {
        const isPanning = reactFlowStoreApi.getState().paneDragging;

        if (isPanning) {
          return;
        }

        updateMyPresence({
          [presenceKey]: reactFlow.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          }),
        });
      },
      [updateMyPresence, presenceKey, reactFlow, reactFlowStoreApi]
    );

    const handlePointerLeave = useCallback(() => {
      updateMyPresence({ [presenceKey]: null });
    }, [updateMyPresence, presenceKey]);

    useEffect(() => {
      if (!reactFlowDomNode) {
        return;
      }

      reactFlowDomNode.addEventListener("pointermove", handlePointerMove);
      reactFlowDomNode.addEventListener("pointerleave", handlePointerLeave);
      window.addEventListener("blur", handlePointerLeave);

      return () => {
        reactFlowDomNode.removeEventListener("pointermove", handlePointerMove);
        reactFlowDomNode.removeEventListener(
          "pointerleave",
          handlePointerLeave
        );
        window.removeEventListener("blur", handlePointerLeave);
        handlePointerLeave();
      };
    }, [reactFlowDomNode, handlePointerMove, handlePointerLeave]);

    return (
      <div
        aria-hidden
        className={cn("lb-root lb-react-flow-cursors", className)}
        {...props}
        ref={forwardedRef}
      >
        {othersConnectionIds.map((connectionId) => (
          <PresenceCursor
            key={connectionId}
            connectionId={connectionId}
            presenceKey={presenceKey}
          />
        ))}

        {children}
      </div>
    );
  }
);
