import { useState, useEffect, memo } from "react";
import {
  useMyPresence,
  useMap,
  useHistory,
  useBatch,
  useSelf,
  useRoom,
} from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";

import "./App.css";

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function connectionIdToColor(connectionId) {
  return COLORS[connectionId % COLORS.length];
}

export default function App() {
  const shapes = useMap("shapes");

  if (shapes == null) {
    return <div>Loading</div>;
  }

  return <Canvas shapes={shapes} />;
}

function Canvas({ shapes }) {
  const [isDragging, setIsDragging] = useState(false);

  const [{ selectedShape }, setPresence] = useMyPresence();
  const batch = useBatch();
  const history = useHistory();
  const me = useSelf();

  const myColor = connectionIdToColor(me.connectionId);

  const insertRectangle = () => {
    batch(() => {
      const shapeId = Date.now() + Math.random() * 100;
      const shape = new LiveObject({
        x: Math.floor(Math.random() * 300),
        y: Math.floor(Math.random() * 300),
        fill: myColor,
      });
      shapes.set(shapeId, shape);
      setPresence({ selectedShape: shapeId }, { addToHistory: true });
    });
  };

  useEffect(() => {
    function onKeyDown(e) {
      switch (e.key) {
        case "i": {
          insertRectangle();
        }
        case "Backspace": {
          shapes.delete(selectedShape);
          setPresence({ selectedShape: null });
          break;
        }
        case "z": {
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              history.redo();
            } else {
              history.undo();
            }
            break;
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [history, insertRectangle, shapes, selectedShape, setPresence]);

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
    <div
      className="canvas"
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
    >
      {Array.from(shapes, ([shapeId, shape]) => {
        return (
          <Rectangle
            key={shapeId}
            id={shapeId}
            onShapePointerDown={onShapePointerDown}
            shape={shape}
            selectionColor={selectedShape === shapeId ? "blue" : undefined}
          />
        );
      })}
    </div>
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
      className={"rectangle"}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        backgroundColor: fill ? fill : "#CCC",
        borderColor: selectionColor || "transparent",
      }}
    ></div>
  );
});
