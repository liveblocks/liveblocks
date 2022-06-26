import { memo, useEffect, useRef, useState } from "react";
import { useBatch, useHistory, useMap, useMyPresence, useOthers, useRoom } from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";
import { motion } from "framer-motion";
import { useBoundingClientRectRef } from "../utils/useBoundingClientRectRef";
import { nanoid } from "nanoid";

/**
 * TODO
 * remove avatar stack and cursors for new example
 * keep complexity in basic components
 * remove framer-motion
 * remove tailwind
 * show liveblocks features e.g. undo/redo
 * maybe add css animations
 */


export default function LiveCanvas() {
  const shapes = useMap("shapes");
  if (!shapes) {
    return <div>Loading...</div>;
  }
  return <Canvas shapes={shapes} />;
}

function Canvas({ shapes }) {
  const [isDragging, setIsDragging] = useState(false);

  const [{ selectedShape }, setPresence] = useMyPresence();
  const batch = useBatch();
  const history = useHistory();
  const others = useOthers();

  const canvasRef = useRef(null);
  const rectRef = useBoundingClientRectRef(canvasRef);

  const insertRectangle = () => {
    batch(() => {
      const shapeId = nanoid();
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

  const onCanvasPointerUp = () => {
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
          x: e.clientX - 100 - rectRef.current.x,
          y: e.clientY - 100 - rectRef.current.y,
        });
      }
    }
  };

  return (
    <div ref={canvasRef} className="w-full h-full bg-gray-100 relative overflow-hidden">
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
    <motion.div
      onPointerDown={(e) => onShapePointerDown(e, id)}
      className="w-96 h-96 absolute border-2"
      style={{
        backgroundColor: fill ? fill : "#CCC",
        borderColor: selectionColor || "transparent",
      }}
      animate={{ x, y }}
    />
  );
});

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

