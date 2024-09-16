import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@liveblocks/react-ui";
import { useCreateThread } from "@liveblocks/react/suspense";
import { useSelf } from "@liveblocks/react";
import styles from "./Toolbar.module.css";
import avatarStyles from "./CommentsCanvas.module.css";
import { useMaxZIndex, useNearEdge } from "../hooks";

export function Toolbar() {
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
      {/* Allows you to place composers */}
      <div className={styles.toolbar}>
        <button
          className={styles.button}
          onClick={() => setState("placing")}
          style={{ cursor: state === "placing" ? "none" : undefined }}
        >
          +
        </button>
      </div>

      {/* Overlay that lets you click and cancel placing */}
      <div
        className={styles.cancelPlacing}
        onClick={reset}
        onContextMenu={(e) => {
          e.preventDefault();
          reset();
        }}
        data-enabled={state !== "initial" ? true : undefined}
      />

      {/* The visible cursor when you're placing */}
      {state === "placing" ? (
        <div
          className={styles.newThreadClick}
          onClick={(e) => {
            // On click, get coords and place down composer
            const avatarOffset = 42;
            setCoords({ x: e.clientX + avatarOffset, y: e.clientY });
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
  // Get create thread function and the current user
  const createThread = useCreateThread();
  const creator = useSelf((me) => me.info);

  // Create thread above other threads
  const maxZIndex = useMaxZIndex();

  // Used to flip composer near edge of screen
  const ref = useRef<HTMLDivElement>(null);
  const { nearRightEdge, nearBottomEdge } = useNearEdge(ref);

  return (
    <div
      ref={ref}
      className={styles.composerWrapper}
      style={{
        transform: `translate(${coords.x}px, ${coords.y}px)`,
      }}
    >
      <div className={avatarStyles.avatar} style={{ cursor: "default" }}>
        {creator ? (
          <img
            src={creator.avatar}
            alt={creator.name}
            width="28px"
            height="28px"
            draggable={false}
          />
        ) : (
          <div />
        )}
      </div>
      <Composer
        className="composer"
        onComposerSubmit={({ body }, e) => {
          e.preventDefault();
          // Create a new thread with the current coords as metadata
          createThread({
            body,
            metadata: {
              x: coords.x,
              y: coords.y,
              zIndex: maxZIndex + 1,
            },
          });
          onSubmit();
        }}
        autoFocus={true}
        data-flip-vertical={nearBottomEdge || undefined}
        data-flip-horizontal={nearRightEdge || undefined}
      />
    </div>
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
    <div
      className={styles.newThreadCursor}
      style={{
        transform: `translate(${coords.x}px, ${coords.y}px)`,
        zIndex: 99999999999,
      }}
    />
  );
}
