import { useState, useMemo, PointerEvent } from "react";
import {
  useHistory,
  useOthers,
  RoomProvider,
  useMutation as useOriginalMutation,
  useStorage as useOriginalStorage,
  useSelf,
} from "@liveblocks/react/suspense";
import { shallow, ClientSideSuspense, useMyPresence } from "@liveblocks/react";
import styles from "../styles/index.module.css";
import { useRouter } from "next/router";
import * as config from "../liveblocks.config";

/* prettier-ignore */
/* Demo helper, please ignore 🙈 */ function useMutations<T>(config: T): {
/* Demo helper, please ignore 🙈 */   [K in keyof T]: T[K] extends (first: any, ...args: infer A) => infer R
/* Demo helper, please ignore 🙈 */     ? (...args: A) => R
/* Demo helper, please ignore 🙈 */     : never;
/* Demo helper, please ignore 🙈 */ } {
/* Demo helper, please ignore 🙈 */   return config as any;
/* Demo helper, please ignore 🙈 */ }

/* prettier-ignore */
/* Demo helper, please ignore 🙈 */ function useStorage<T>(
/* Demo helper, please ignore 🙈 */     selector: (root: Liveblocks["StorageV2"]) => T,
/* Demo helper, please ignore 🙈 */     isEqual?: (a: T, b: T) => boolean
/* Demo helper, please ignore 🙈 */   ): T {
/* Demo helper, please ignore 🙈 */     return useOriginalStorage(selector as any, isEqual);
/* Demo helper, please ignore 🙈 */   }

export default function Room() {
  const roomId = useExampleRoomId("nextjs-whiteboard");
  return (
    <RoomProvider id={roomId} initialPresence={{ selectedShape: null }}>
      <div className={styles.container}>
        <ClientSideSuspense fallback={<Loading />}>
          <Canvas />
        </ClientSideSuspense>
      </div>
    </RoomProvider>
  );
}

function Canvas() {
  const [isDragging, setIsDragging] = useState(false);
  const shapeIds = useStorage(
    (root) => Array.from(root.shapes.keys()),
    shallow
  );

  const history = useHistory();

  const [presence, setMyPresence] = useMyPresence();

  const { insertRectangle, deleteRectangle, setXY } = useMutations(config);

  const onShapePointerDown = useOriginalMutation(
    ({ setMyPresence }, e: PointerEvent<HTMLDivElement>, shapeId: string) => {
      history.pause();
      e.stopPropagation();

      setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
      setIsDragging(true);
    },
    [history]
  );

  const onCanvasPointerUp = useOriginalMutation(
    ({ setMyPresence }) => {
      if (!isDragging) {
        setMyPresence({ selectedShape: null }, { addToHistory: true });
      }

      setIsDragging(false);
      history.resume();
    },
    [isDragging, history]
  );

  const onCanvasPointerMove = useOriginalMutation(
    ({ self }, e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!isDragging) {
        return;
      }

      const shapeId = self.presence.selectedShape;
      if (!shapeId) {
        return;
      }

      setXY(shapeId, e.clientX - 50, e.clientY - 50);
    },
    [isDragging]
  );

  return (
    <>
      <div
        className={styles.canvas}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {shapeIds.map((shapeId: string) => {
          return (
            <Rectangle
              key={shapeId}
              id={shapeId}
              onShapePointerDown={onShapePointerDown}
            />
          );
        })}
      </div>
      <div className={styles.toolbar}>
        <button
          onClick={() => {
            const shapeId = Date.now().toString();
            const x = getRandomInt(300);
            const y = getRandomInt(300);
            const fill = getRandomColor();
            insertRectangle(shapeId, x, y, fill);
            setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
          }}
        >
          Rectangle
        </button>
        <button
          onClick={() =>
            presence.selectedShape && deleteRectangle(presence.selectedShape)
          }
        >
          Delete
        </button>
        <button onClick={() => history.undo()}>Undo</button>
        <button onClick={() => history.redo()}>Redo</button>
      </div>
    </>
  );
}

type RectangleProps = {
  id: string;
  onShapePointerDown: (e: PointerEvent<HTMLDivElement>, id: string) => void;
};

function Rectangle({ id, onShapePointerDown }: RectangleProps) {
  const { x, y, fill } = useStorage((root) => root.shapes.get(id)) ?? {};

  const selectedByMe = useSelf((me) => me.presence.selectedShape === id);
  const selectedByOthers = useOthers((others) =>
    others.some((other) => other.presence.selectedShape === id)
  );
  const selectionColor = selectedByMe
    ? "blue"
    : selectedByOthers
      ? "green"
      : "transparent";

  return (
    <div
      onPointerDown={(e) => onShapePointerDown(e, id)}
      className={styles.rectangle}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: !selectedByMe ? "transform 120ms linear" : "none",
        backgroundColor: fill || "#CCC",
        borderColor: selectionColor,
      }}
    />
  );
}

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function getRandomColor(): string {
  return COLORS[getRandomInt(COLORS.length)];
}

function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.loading}>
        <img src="https://liveblocks.io/loading.svg" alt="Loading" />
      </div>
    </div>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const { query } = useRouter();
  const exampleRoomId = useMemo(() => {
    return query?.exampleId ? `${roomId}-${query.exampleId}` : roomId;
  }, [query, roomId]);

  return exampleRoomId;
}
