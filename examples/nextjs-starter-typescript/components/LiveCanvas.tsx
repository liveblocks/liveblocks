import { useRef, useState } from "react";
import { Shapes, useBatch, useHistory, useMap, useMyPresence, useOthers } from "../liveblocks.config";
import { LiveObject } from "@liveblocks/client";
import { useBoundingClientRectRef } from "../utils/useBoundingClientRectRef";
import { nanoid } from "nanoid";
import styles from "./LiveCanvas.module.css";
import Note from "./Note";

/**
 * TODO
 * remove avatar stack and cursors for new example
 * keep complexity in basic components
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

function Canvas({ shapes }: { shapes: Shapes }) {
  const [myPresence, updateMyPresence] = useMyPresence();
  const batch = useBatch();
  const history = useHistory();
  const others = useOthers();

  const canvasRef = useRef(null);
  const rectRef = useBoundingClientRectRef(canvasRef);

  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef(null);

  function insertNote() {
    batch(() => {
      const shapeId = nanoid();
      const shape = new LiveObject({
        x: getRandomInt(300),
        y: getRandomInt(300),
        text: "",
        selectedBy: null,
        id: shapeId,
      });
      shapes.set(shapeId, shape);
      updateMyPresence({ selectedShape: shapeId }, { addToHistory: true });
    });
  }

  function deleteNote(shapeId = myPresence.selectedShape) {
    shapes.delete(shapeId);
  }

  function handleNotePointerDown(e, shapeId) {
    history.pause();
    e.stopPropagation();
    const element = document.querySelector(`[data-note="${shapeId}"]`);
    const rect = element.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    dragInfo.current = { element, position };

    updateMyPresence({ selectedShape: shapeId }, { addToHistory: true });
    setIsDragging(true);
  }

  function handleCanvasPointerUp() {
    if (!isDragging) {
      updateMyPresence({ selectedShape: null }, { addToHistory: true });
    }

    setIsDragging(false);
    dragInfo.current = null;
    history.resume();
  }

  function handleCanvasPointerMove(e) {
    e.preventDefault();

    if (isDragging && dragInfo.current) {
      const shape = shapes.get(myPresence.selectedShape);
      if (shape) {
        const { x, y } = dragInfo.current.position;
        shape.update({
          x: e.clientX - rectRef.current.x - x,
          y: e.clientY - rectRef.current.y - y,
        });
      }
    }
  }

  return (
    <div ref={canvasRef} className={styles.canvas}>
      <div
        className={styles.canvasPanel}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        {[...shapes.values()].map((shape) => {
          const id = shape.get("id");
          const selectionColor =
            myPresence.selectedShape === shape.id
              ? "blue"
              : others
                .toArray()
                .some((user) => user.presence?.selectedShape === id)
                ? "green"
                : undefined;

          return (
            <Note
              key={id}
              shape={shape}
              onPointerDown={(e) => handleNotePointerDown(e, id)}
              onDelete={() => deleteNote(id)}
              selectionColor={selectionColor}
            />
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <button onClick={insertNote}>Rectangle</button>
        <button onClick={deleteNote} disabled={myPresence.selectedShape == null}>
          Delete
        </button>
        <button onClick={history.undo}>Undo</button>
        <button onClick={history.redo}>Redo</button>
      </div>
    </div>
  );
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
