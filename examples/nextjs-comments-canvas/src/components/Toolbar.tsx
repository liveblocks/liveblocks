import { useCallback, useState } from "react";
import { NewThreadCursor } from "./NewThreadCursor";
import { Composer } from "@liveblocks/react-comments";
import { useCreateThread, useSelf } from "../../liveblocks.config";
import styles from "./Toolbar.module.css";
import avatarStyles from "./CommentsCanvas.module.css";

export function Toolbar() {
  const createThread = useCreateThread();
  const creator = useSelf((me) => me.info);

  const [state, setState] = useState<"initial" | "placing" | "placed">(
    "initial"
  );
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const resetState = useCallback(() => {
    setState("initial");
    setCoords({ x: 0, y: 0 });
  }, []);

  return (
    <>
      <div className={styles.toolbar}>
        <button
          className={styles.button}
          onClick={() => setState("placing")}
          style={{ cursor: state === "placing" ? "none" : undefined }}
        >
          +
        </button>
      </div>

      {state !== "initial" ? (
        <div
          className={styles.cancelPlacing}
          onClick={resetState}
          onContextMenu={(e) => {
            e.preventDefault();
            resetState();
          }}
        />
      ) : null}

      {state === "placing" ? (
        <div
          className={styles.newThreadClick}
          onClick={(e) => {
            const avatarOffset = 42;
            setCoords({ x: e.clientX + avatarOffset, y: e.clientY });
            setState("placed");
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            resetState();
          }}
        >
          <NewThreadCursor />
        </div>
      ) : null}

      {state === "placed" ? (
        <>
          <div
            className={styles.composerWrapper}
            style={{ transform: `translate(${coords.x}px, ${coords.y}px)` }}
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
                setState("initial");
                createThread({ body, metadata: { x: coords.x, y: coords.y } });
              }}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
