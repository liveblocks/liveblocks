import { useState, useEffect, memo } from "react";
import {
  useMyPresence,
  useMap,
  useHistory,
  useBatch,
  useRoom,
  useOthers,
} from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";

import "./App.css";

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

export default function App() {
  const shapes = useMap("shapes");

  if (shapes == null) {
    return <div className="loading">Loading</div>;
  }

  return <Canvas shapes={shapes} />;
}

function Canvas({ shapes }) {
  const [isDragging, setIsDragging] = useState(false);

  const [{ selectedShape }, setPresence] = useMyPresence();
  const batch = useBatch();
  const history = useHistory();
  const others = useOthers();

  const insertRectangle = () => {
    batch(() => {
      const shapeId = Date.now();
      const shape = new LiveObject({
        x: getRandomInt(300),
        y: getRandomInt(300),
        fill: getRandomColor(),
      });
      shapes.set(shapeId, shape);
      setPresence({ selectedShape: shapeId }, { addToHistory: true });
    });
  };

  const deleteRectangle = () => {
    shapes.delete(selectedShape);
  };

  const onShapePointerDown = (e, shapeId) => {
    history.pause();
    e.stopPropagation();

    setPresence({ selectedShape: shapeId }, { addToHistory: true });

    setIsDragging(true);
  };

  const onCanvasPointerUp = (e) => {
    if (!isDragging) {
      setPresence({ selectedShape: null }, { addToHistory: true });
    }

    setIsDragging(false);

    history.resume();
  };

  const onCanvasPointerMove = (e) => {
    e.preventDefault();

    if (isDragging) {
      const shape = shapes.get(selectedShape);
      if (shape) {
        shape.update({
          x: e.clientX - 50,
          y: e.clientY - 50,
        });
      }
    }
  };

  return (
    <>
      <div
        className="canvas"
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {Array.from(shapes, ([shapeId, shape]) => {
          let selectionColor =
            selectedShape === shapeId
              ? "blue"
              : others
                  .toArray()
                  .some((user) => user.presence?.selectedShape === shapeId)
              ? "green"
              : undefined;

          return (
            <Rectangle
              key={shapeId}
              id={shapeId}
              onShapePointerDown={onShapePointerDown}
              shape={shape}
              selectionColor={selectionColor}
            />
          );
        })}
      </div>
      <div className="toolbar">
        <button onClick={insertRectangle}>Rectangle</button>
        <button onClick={deleteRectangle} disabled={selectedShape == null}>
          Delete
        </button>
        <button onClick={history.undo}>Undo</button>
        <button onClick={history.redo}>Redo</button>
      </div>
    </>
  );
}

const Rectangle = memo(({ shape, id, onShapePointerDown, selectionColor }) => {
  const [{ x, y, fill }, setShapeData] = useState(shape.toObject());

  const room = useRoom();

  useEffect(() => {
    function onChange() {
      setShapeData(shape.toObject());
    }

    return room.subscribe(shape, onChange);
  }, [room, shape]);

  return (
    <div
      onPointerDown={(e) => onShapePointerDown(e, id)}
      className="rectangle"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        backgroundColor: fill ? fill : "#CCC",
        borderColor: selectionColor || "transparent",
      }}
    ></div>
  );
});
