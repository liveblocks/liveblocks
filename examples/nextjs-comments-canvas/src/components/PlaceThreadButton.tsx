import { useCallback, useEffect, useState } from "react";
import { CommentPin, FloatingComposer } from "@liveblocks/react-ui";
import { useSelf } from "@liveblocks/react";
import { useMaxZIndex } from "../hooks";

export function PlaceThreadButton() {
  const [state, setState] = useState<"initial" | "placing" | "placed">(
    "initial"
  );
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const reset = useCallback(() => {
    setState("initial");
    setCoords({ x: 0, y: 0 });
  }, []);

  return (
    <>
      {/* Allows you to place floating composers */}
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <button
          onClick={() => setState("placing")}
          style={{ cursor: state === "placing" ? "none" : undefined }}
        >
          ➕
        </button>
      </div>

      {/* Overlay that lets you click and cancel placing */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          background: "rgba(0, 0, 0, 0.2)",
          pointerEvents: state === "initial" ? "none" : undefined,
          opacity: state !== "initial" ? 1 : 0,
        }}
        onClick={reset}
        onContextMenu={(e) => {
          e.preventDefault();
          reset();
        }}
      />

      {/* The visible cursor when you're placing */}
      {state === "placing" ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: "none",
          }}
          onClick={(e) => {
            // On click, get coords and place down composer
            setCoords({ x: e.clientX, y: e.clientY });
            setState("placed");
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            reset();
          }}
        >
          <NewThreadCursor />
        </div>
      ) : null}

      {/* When cursor placed, show a composer on the canvas */}
      {state === "placed" ? (
        <ThreadComposer coords={coords} onSubmit={() => setState("initial")} />
      ) : null}
    </>
  );
}

function ThreadComposer({
  coords,
  onSubmit,
}: {
  coords: { x: number; y: number };
  onSubmit: () => void;
}) {
  // Get the current user
  const creatorId = useSelf((me) => me.id);
  // Create thread above other threads
  const maxZIndex = useMaxZIndex();

  return (
    <FloatingComposer
      defaultOpen={true}
      metadata={{
        x: coords.x,
        y: coords.y,
        zIndex: maxZIndex + 1,
      }}
      onComposerSubmit={onSubmit}
    >
      <CommentPin
        userId={creatorId ?? undefined}
        corner="top-left"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate(${coords.x}px, ${coords.y}px)`,
        }}
      />
    </FloatingComposer>
  );
}

// Render the new thread component over the current user's cursor
function NewThreadCursor() {
  const [coords, setCoords] = useState({
    x: -10000,
    y: -10000,
  });

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setCoords({
        x: e.clientX,
        y: e.clientY,
      });
    };

    document.addEventListener("mousemove", updatePosition, false);
    document.addEventListener("mouseenter", updatePosition, false);

    return () => {
      document.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("mouseenter", updatePosition);
    };
  }, []);

  return (
    <CommentPin
      corner="top-left"
      style={{
        cursor: "none",
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${coords.x}px, ${coords.y}px)`,
        zIndex: 99999999999,
      }}
    />
  );
}
