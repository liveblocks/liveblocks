import { useEffect } from "react";
import useStore from "./store";
import shallow from "zustand/shallow";

import "./App.css";

export default function App() {
  const shapes = useStore((state) => state.shapes);
  const selectedShape = useStore((state) => state.selectedShape);
  const onCanvasPointerUp = useStore((state) => state.onCanvasPointerUp);
  const onCanvasPointerMove = useStore((state) => state.onCanvasPointerMove);
  const onAddRectangle = useStore((state) => state.onAddRectangle);
  const onDeleteRectangle = useStore((state) => state.onDeleteRectangle);
  const onUndo = useStore((state) => state.onUndo);
  const onRedo = useStore((state) => state.onRedo);
  const others = useStore((state) => state.liveblocks.others);

  // Liveblocks integration start
  const { enterRoom, leaveRoom, isLoading } = useStore(
    (state) => ({
      enterRoom: state.liveblocks.enterRoom,
      leaveRoom: state.liveblocks.leaveRoom,
      isLoading: state.liveblocks.isStorageLoading,
    }),
    shallow
  );

  useEffect(() => {
    enterRoom("zustand-whiteboard", { shapes: {} });

    return () => {
      leaveRoom("zustand-whiteboard");
    };
  }, [enterRoom, leaveRoom]);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
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
        <button onClick={onAddRectangle}>Add</button>
        <button onClick={onDeleteRectangle} disabled={selectedShape == null}>
          Delete
        </button>
        <button onClick={onUndo}>Undo</button>
        <button onClick={onRedo}>Redo</button>
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
    ></div>
  );
};
