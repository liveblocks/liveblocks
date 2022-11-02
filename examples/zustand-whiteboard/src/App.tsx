import { useEffect } from "react";
import useStore, { Shape } from "./store";
import "./App.css";

let roomId = "zustand-whiteboard";

overrideRoomId();

export default function App() {
  const shapes = useStore((state) => state.shapes);
  const selectedShape = useStore((state) => state.selectedShape);
  const onCanvasPointerUp = useStore((state) => state.onCanvasPointerUp);
  const onCanvasPointerMove = useStore((state) => state.onCanvasPointerMove);
  const insertRectangle = useStore((state) => state.insertRectangle);
  const deleteShape = useStore((state) => state.deleteShape);
  const undo = useStore((state) => state.liveblocks.room?.history.undo);
  const redo = useStore((state) => state.liveblocks.room?.history.redo);
  const others = useStore((state) => state.liveblocks.others);

  const enterRoom = useStore((state) => state.liveblocks.enterRoom);
  const leaveRoom = useStore((state) => state.liveblocks.leaveRoom);
  const isLoading = useStore((state) => state.liveblocks.isStorageLoading);

  useEffect(() => {
    enterRoom(roomId);
    return () => {
      leaveRoom(roomId);
    };
  }, [enterRoom, leaveRoom]);

  if (isLoading) {
    return (
      <div className="loading">
        <img src="https://liveblocks.io/loading.svg" alt="Loading" />
      </div>
    );
  }

  return (
    <>
      <div
        className="canvas"
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {Object.entries(shapes).map(([shapeId, shape]) => {
          let selectionColor = "transparent";

          if (selectedShape === shapeId) {
            selectionColor = "blue";
          } else if (
            others.some((user) => user.presence?.selectedShape === shapeId)
          ) {
            selectionColor = "green";
          }

          return (
            <Rectangle
              key={shapeId}
              id={shapeId}
              shape={shape}
              selectionColor={selectionColor}
              transition={selectedShape !== shapeId}
            />
          );
        })}
      </div>
      <div className="toolbar">
        <button onClick={insertRectangle}>Rectangle</button>
        <button onClick={deleteShape} disabled={selectedShape == null}>
          Delete
        </button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
    </>
  );
}

type RectangleProps = {
  shape: Shape;
  selectionColor?: string;
  id: string;
  transition: boolean;
};

const Rectangle = ({
  shape,
  selectionColor,
  id,
  transition,
}: RectangleProps) => {
  const onShapePointerDown = useStore((state) => state.onShapePointerDown);

  return (
    <div
      className="rectangle"
      style={{
        transform: `translate(${shape.x}px, ${shape.y}px)`,
        transition: transition ? "transform 120ms linear" : "none",
        backgroundColor: shape.fill ? shape.fill : "#CCC",
        borderColor: selectionColor,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onShapePointerDown(id);
      }}
    />
  );
};

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideRoomId() {
  const query = new URLSearchParams(window?.location?.search);
  const roomIdSuffix = query.get("roomId");

  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}
