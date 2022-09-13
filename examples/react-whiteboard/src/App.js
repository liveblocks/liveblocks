import { useState, memo } from "react";
import {
  useHistory,
  useCanUndo,
  useCanRedo,
  useOthers,
  RoomProvider,
  useStorage,
  useMutation,
  useSelf,
} from './liveblocks.config'
import { LiveMap, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense, shallow } from "@liveblocks/react";

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

export default function App({ roomId }) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selectedShape: null }}
      initialStorage={{
        shapes: new LiveMap(),
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Canvas />}
      </ClientSideSuspense>
    </RoomProvider>
  )
}

function Canvas() {
  const [isDragging, setIsDragging] = useState(false);
  const shapeIds = useStorage((root) => Array.from(root.shapes.keys()), shallow);

  const selectedShape = useSelf((me) => me.presence.selectedShape);
  const history = useHistory();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const insertRectangle = useMutation(({ root, setMyPresence }) => {
    const shapeId = Date.now().toString();
    const shape = new LiveObject({
      x: getRandomInt(300),
      y: getRandomInt(300),
      fill: getRandomColor(),
    });
    root.get("shapes").set(shapeId, shape);
    setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
  }, []);

  const deleteRectangle = useMutation(({ root }, shapeId) => {
    root.get("shapes").delete(shapeId);
  }, []);

  const onShapePointerDown = useMutation(({ setMyPresence }, e, shapeId) => {
    history.pause();
    e.stopPropagation();

    setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
    setIsDragging(true);
  }, [history]);

  const onCanvasPointerUp = useMutation(({ setMyPresence }, e) => {
    if (!isDragging) {
      setMyPresence({ selectedShape: null }, { addToHistory: true });
    }

    setIsDragging(false);
    history.resume();
  }, [isDragging, history]);

  const onCanvasPointerMove = useMutation(({ root, self }, e) => {
    e.preventDefault();
    if (!isDragging) {
      return;
    }

    const shapeId = self.presence.selectedShape;
    if (!shapeId) {
      return;
    }

    const shape = root.get("shapes").get(shapeId);
    if (!shape) {
      return
    }

    shape.update({
      x: e.clientX - 50,
      y: e.clientY - 50,
    });
  }, [isDragging]);

  return (
    <>
      <div
        className="canvas"
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {shapeIds.map((shapeId) => {
          return (
            <Rectangle
              key={shapeId}
              id={shapeId}
              onShapePointerDown={onShapePointerDown}
            />
          );
        })}
      </div>
      <div className="toolbar">
        <button onClick={() => insertRectangle()}>Rectangle</button>
        <button onClick={() => deleteRectangle(selectedShape)} disabled={selectedShape == null}>
          Delete
        </button>
        <button onClick={history.undo} disabled={!canUndo}>
          Undo
        </button>
        <button onClick={history.redo} disabled={!canRedo}>
          Redo
        </button>
      </div>
    </>
  );
}

const Rectangle = memo(
  ({ id, onShapePointerDown }) => {
    const { x, y, fill } = useStorage((root) => root.shapes.get(id));

    const selectedByMe = useSelf((me) => me.presence.selectedShape === id);
    const selectedByOthers = useOthers((others) => others.some(other => other.presence.selectedShape === id));
    const selectionColor = selectedByMe ? "blue" : selectedByOthers ? "green" : "transparent";

    return (
      <div
        onPointerDown={(e) => onShapePointerDown(e, id)}
        className="rectangle"
        style={{
          transform: `translate(${x}px, ${y}px)`,
          transition: !selectedByMe ? "transform 120ms linear" : "none",
          backgroundColor: fill ? fill : "#CCC",
          borderColor: selectionColor,
        }}
      />
    );
  }
);

function Loading() {
  return (
    <div className="loading">
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}
