import { useEffect, memo } from "react";
import useStore from "./store";
import shallow from "zustand/shallow";

import "./App.css";

export default function App() {
  const shapes = useStore((state) => state.shapes);
  const selectedShape = useStore((state) => state.selectedShape);
  const onCanvasPointerUp = useStore((state) => state.onCanvasPointerUp);
  const onCanvasPointerMove = useStore((state) => state.onCanvasPointerMove);
  const onKeyDown = useStore((state) => state.onKeyDown);
  const others = useStore((state) => state.liveblocks.others);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

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
    return <div>Loading...</div>;
  }

  return (
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
