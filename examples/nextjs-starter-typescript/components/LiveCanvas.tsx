import { ChangeEvent, FocusEvent, PointerEvent, useRef, useState } from "react";
import { Presence, Shape, Shapes, useBatch, useHistory, useMap, useMyPresence, useOthers, UserMeta, useSelf } from "../liveblocks.config";
import { LiveObject, User } from "@liveblocks/client";
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

export default function LiveCanvas () {
  const shapes = useMap("shapes");
  const currentUser = useSelf();

  if (!shapes || !currentUser) {
    return <div>Loading...</div>;
  }

  return <Canvas shapes={shapes} currentUser={currentUser} />;
}

function Canvas ({ shapes, currentUser }: { shapes: Shapes, currentUser: User<Presence, UserMeta> }) {
  const [myPresence, updateMyPresence] = useMyPresence();
  const batch = useBatch();
  const history = useHistory();

  const canvasRef = useRef(null);
  const rectRef = useBoundingClientRectRef(canvasRef);

  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef<{ element: Element, position: { x: number, y: number }} | null>();

  function insertNote () {
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

  function handleNoteDelete (shapeId: string) {
    shapes.delete(shapeId);
  }

  function handleNotePointerDown (e: PointerEvent<HTMLDivElement>, shapeId: string) {
    history.pause();
    e.stopPropagation();
    const element = document.querySelector(`[data-note="${shapeId}"]`);
    if (!element) {
      return;
    }

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

  function handleCanvasPointerMove(e: PointerEvent<HTMLDivElement>) {
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

  // When note text is changed, update the shape's text
  function handleNoteChange(e: ChangeEvent<HTMLTextAreaElement>, shape: Shape) {
    shape.update({ text: e.target.value, selectedBy: currentUser.info });
  }

  // When note is focused, update selected user
  function handleNoteFocus(e: FocusEvent<HTMLTextAreaElement>, shape: Shape) {
    history.pause();
    shape.update({ selectedBy: currentUser.info });
  }

  // When note is unfocused, update selected user
  function handleNoteBlur(e: FocusEvent<HTMLTextAreaElement>, shape: Shape) {
    shape.set("selectedBy", null);
    history.resume();
  }

  return (
    <div ref={canvasRef} className={styles.canvas}>
      <div
        className={styles.canvasPanel}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        {Array.from(shapes.values()).map((shape) => (
          <Note
            key={shape.get("id")}
            shape={shape}
            onPointerDown={(e) => handleNotePointerDown(e, shape.get("id"))}
            onDelete={() => handleNoteDelete(shape.get("id"))}
            onChange={(e) => handleNoteChange(e, shape)}
            onFocus={(e) => handleNoteFocus(e, shape)}
            onBlur={(e) => handleNoteBlur(e, shape)}
          />
        ))}
      </div>

      <div className={styles.toolbar}>
        <button onClick={insertNote}>Rectangle</button>
        <button onClick={history.undo}>Undo</button>
        <button onClick={history.redo}>Redo</button>
      </div>
    </div>
  );
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
