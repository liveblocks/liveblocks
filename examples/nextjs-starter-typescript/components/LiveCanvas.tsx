import { ChangeEvent, FocusEvent, PointerEvent, useRef, useState } from "react";
import { Presence, Shape, Shapes, useBatch, useHistory, useMap, UserMeta, useSelf } from "../liveblocks.config";
import { LiveObject, User } from "@liveblocks/client";
import { useBoundingClientRectRef } from "../utils/useBoundingClientRectRef";
import { nanoid } from "nanoid";
import styles from "./LiveCanvas.module.css";
import Note from "./Note";

/**
 * TODO
 * maybe show more liveblocks features
 * remove Inter font later
 */

/**
 * This file shows how to create a multiplayer canvas with draggable notes.
 * The notes allow you to add text, display who's currently editing them, and can be removed.
 * There's also a toolbar allowing you to undo/redo your actions and add more notes.
 */

export default function LiveCanvas () {
  const shapes = useMap("shapes");
  const currentUser = useSelf();

  // Show spinner when loading
  if (!shapes || !currentUser) {
    return (
      <div className={styles.loading}>
        <svg className={styles.loadingIcon} width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return <Canvas shapes={shapes} currentUser={currentUser} />;
}

// The main Liveblocks code, handling all events and shape modifications
function Canvas ({ shapes, currentUser }: { shapes: Shapes, currentUser: User<Presence, UserMeta> }) {
  const batch = useBatch();
  const history = useHistory();

  const canvasRef = useRef(null);
  const rectRef = useBoundingClientRectRef(canvasRef);

  // Info about element being dragged
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef<{
    shapeId: string,
    element: Element,
    offset: { x: number, y: number }
  } | null>();

  // Insert a new note onto the canvas
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
    });
  }

  // Delete a note
  function handleNoteDelete (shapeId: string) {
    shapes.delete(shapeId);
  }

  // On note pointer down, pause history, set dragged note
  function handleNotePointerDown (e: PointerEvent<HTMLDivElement>, shapeId: string) {
    history.pause();
    e.stopPropagation();
    const element = document.querySelector(`[data-note="${shapeId}"]`);
    if (!element) {
      return;
    }

    // Get position of cursor on note, to use as an offset when moving notes
    const rect = element.getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    dragInfo.current = { shapeId, element, offset };
    setIsDragging(true);
  }

  // On canvas pointer up, remove dragged element, resume history
  function handleCanvasPointerUp() {
    setIsDragging(false);
    dragInfo.current = null;
    history.resume();
  }

  // If dragging on canvas pointer move, move element and adjust for offset
  function handleCanvasPointerMove(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();

    if (isDragging && dragInfo.current) {
      const shape = shapes.get(dragInfo.current.shapeId);
      if (shape) {
        const { x, y } = dragInfo.current.offset;
        shape.update({
          x: e.clientX - rectRef.current.x - x,
          y: e.clientY - rectRef.current.y - y,
        });
      }
    }
  }

  // When note text is changed, update the text and selected user on the LiveObject
  function handleNoteChange(e: ChangeEvent<HTMLTextAreaElement>, shape: Shape) {
    shape.update({ text: e.target.value, selectedBy: currentUser.info });
  }

  // When note is focused, update the selected user LiveObject
  function handleNoteFocus(e: FocusEvent<HTMLTextAreaElement>, shape: Shape) {
    history.pause();
    shape.update({ selectedBy: currentUser.info });
  }

  // When note is unfocused, remove the selected user on the LiveObject
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
        {/*
          * Iterate through each shape in the LiveMap and render it as a note
          */
          Array.from(shapes.values()).map((shape) => (
          <Note
            key={shape.get("id")}
            shape={shape}
            dragged={shape.get("id") === dragInfo?.current?.shapeId}
            onPointerDown={(e) => handleNotePointerDown(e, shape.get("id"))}
            onDelete={() => handleNoteDelete(shape.get("id"))}
            onChange={(e) => handleNoteChange(e, shape)}
            onFocus={(e) => handleNoteFocus(e, shape)}
            onBlur={(e) => handleNoteBlur(e, shape)}
          />
        ))}
      </div>

      <div className={styles.toolbar}>
        <button className={styles.toolbarButton} onClick={() => insertNote()}>
          <PlusIcon />
        </button>
        <button className={styles.toolbarButton} onClick={() => history.undo()}>
          <UndoIcon />
        </button>
        <button className={styles.toolbarButton} onClick={() => history.redo()}>
          <RedoIcon />
        </button>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M15 16H21C22.654 16 24 17.346 24 19C24 20.654 22.654 22 21 22H18V24H21C23.757 24 26 21.757 26 19C26 16.243 23.757 14 21 14H15V11L10 15L15 19V16Z" transform="translate(-7, -7)" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M15 24H18V22H15C13.346 22 12 20.654 12 19C12 17.346 13.346 16 15 16H21V19L26 15L21 11V14H15C12.243 14 10 16.243 10 19C10 21.757 12.243 24 15 24Z" transform="translate(-7, -7)" />
    </svg>
  );
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}
