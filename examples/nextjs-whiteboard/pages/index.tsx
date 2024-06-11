import { useState, useMemo, PointerEvent } from "react";
import {
  useHistory,
  useOthers,
  RoomProvider,
  useStorage,
  useMutation,
  useSelf,
} from "@liveblocks/react/suspense";
import { LiveMap, LiveObject } from "@liveblocks/client";
import { shallow, ClientSideSuspense } from "@liveblocks/react";
import styles from "../styles/index.module.css";
import { useRouter } from "next/router";

export default function Room() {
  const roomId = useExampleRoomId("nextjs-whiteboard");
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selectedShape: null }}
      initialStorage={{ shapes: new LiveMap() }}
    >
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

  const insertRectangle = useMutation(({ storage, setMyPresence }) => {
    const shapeId = Date.now().toString();
    const shape = new LiveObject({
      x: getRandomInt(300),
      y: getRandomInt(300),
      fill: getRandomColor(),
    });
    storage.get("shapes").set(shapeId, shape);
    setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
  }, []);

  const deleteRectangle = useMutation(({ storage, self, setMyPresence }) => {
    const shapeId = self.presence.selectedShape;
    if (!shapeId) {
      return;
    }

    storage.get("shapes").delete(shapeId);
    setMyPresence({ selectedShape: null });
  }, []);

  const onShapePointerDown = useMutation(
    ({ setMyPresence }, e: PointerEvent<HTMLDivElement>, shapeId: string) => {
      history.pause();
      e.stopPropagation();

      setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
      setIsDragging(true);
    },
    [history]
  );

  const onCanvasPointerUp = useMutation(
    ({ setMyPresence }) => {
      if (!isDragging) {
        setMyPresence({ selectedShape: null }, { addToHistory: true });
      }

      setIsDragging(false);
      history.resume();
    },
    [isDragging, history]
  );

  const onCanvasPointerMove = useMutation(
    ({ storage, self }, e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!isDragging) {
        return;
      }

      const shapeId = self.presence.selectedShape;
      if (!shapeId) {
        return;
      }

      const shape = storage.get("shapes").get(shapeId);

      if (shape) {
        shape.update({
          x: e.clientX - 50,
          y: e.clientY - 50,
        });
      }
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
        <button onClick={() => insertRectangle()}>Rectangle</button>
        <button onClick={() => deleteRectangle()}>Delete</button>
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
