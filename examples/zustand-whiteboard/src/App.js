import { useEffect } from "react";
import useStore from "./store";
import "./App.css";

let roomId = "zustand-whiteboard";

/**
 * @optional
 *
 * Add a suffix to the room ID using a query parameter.
 * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
 *
 * http://localhost:3000/?room=1234 → zustand-whiteboard-1234
 */
const query = new URLSearchParams(window?.location?.search);
const roomSuffix = query.get("room");

if (roomSuffix) {
  roomId = `${roomId}-${roomSuffix}`;
}

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
  const isLoading = useStore((state) => state.liveblocks.isLoading);

  useEffect(() => {
    enterRoom(roomId, { shapes: {} });

    return () => {
      leaveRoom(roomId);
    };
  }, [enterRoom, leaveRoom]);

  if (isLoading) {
    return null;
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

const Rectangle = ({ shape, selectionColor, id }) => {
  const onShapePointerDown = useStore((state) => state.onShapePointerDown);

  return (
    <div
      className="rectangle"
      style={{
        transform: `translate(${shape.x}px, ${shape.y}px)`,
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
