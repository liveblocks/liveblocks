import { ChangeEventHandler, FocusEventHandler, memo, PointerEventHandler, useEffect, useState } from "react";
import { Shape, useRoom, useSelf } from "../liveblocks.config";
import styles from "./Note.module.css";
import { Avatar } from "./Avatar";

type NoteProps = {
  shape: Shape;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onDelete: () => void;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onFocus: FocusEventHandler<HTMLTextAreaElement>;
  onBlur: FocusEventHandler<HTMLTextAreaElement>;
}

function Note ({ shape, onPointerDown, onDelete, onChange, onFocus, onBlur }: NoteProps) {
  const room = useRoom();
  const self = useSelf();

  const [{ x, y, text, id, selectedBy }, setShapeData] = useState(shape.toObject());
  const [isDragging, setIsDragging] = useState(false);
  const fontSize = text.length < 20 ? "1.5rem" : "1.2rem";

  // Update useState shape props whenever they change
  useEffect(() => {
    const unsubscribe = room.subscribe(shape, () => {
      setShapeData(shape.toObject());
    });

    return () => unsubscribe();
  }, [room, shape]);

  if (!self) {
    return null;
  }

  return (
    <>
      <div
        data-note={id}
        className={styles.note}
        style={{
          transform: `translate(${x}px, ${y}px)`,
          transition: !isDragging ? "transform 0.5s cubic-bezier(.17, .93, .38, 1)" : undefined,
          zIndex: isDragging ? 1 : 0,
        }}
        onPointerDown={(e) => {
          setIsDragging(true);
          onPointerDown(e);
        }}
        onPointerUp={() => setIsDragging(false)}
      >
        <div className={styles.noteInner} style={{ borderColor: selectedBy?.color || undefined }}>
          <div className={styles.noteHeader}>
            <button
              className={styles.noteDelete}
              onClick={() => onDelete()}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M0.434425 0.434416C0.584447 0.284439 0.787893 0.200187 1.00002 0.200187C1.21216 0.200187 1.4156 0.284439 1.56562 0.434416L5.00002 3.86882L8.43442 0.434416C8.50822 0.358008 8.5965 0.297062 8.6941 0.255135C8.7917 0.213208 8.89668 0.191139 9.0029 0.190216C9.10913 0.189293 9.21447 0.209534 9.31279 0.249759C9.41111 0.289983 9.50043 0.349386 9.57554 0.4245C9.65065 0.499614 9.71006 0.588936 9.75028 0.687253C9.79051 0.78557 9.81075 0.890914 9.80982 0.997137C9.8089 1.10336 9.78683 1.20834 9.74491 1.30594C9.70298 1.40354 9.64203 1.49182 9.56562 1.56562L6.13122 5.00002L9.56562 8.43442C9.71135 8.5853 9.79199 8.78738 9.79016 8.99714C9.78834 9.20689 9.70421 9.40754 9.55588 9.55587C9.40755 9.7042 9.2069 9.78833 8.99715 9.79016C8.78739 9.79198 8.58531 9.71134 8.43442 9.56562L5.00002 6.13122L1.56562 9.56562C1.41474 9.71134 1.21266 9.79198 1.0029 9.79016C0.793146 9.78833 0.592496 9.7042 0.44417 9.55587C0.295843 9.40754 0.211708 9.20689 0.209885 8.99714C0.208062 8.78738 0.288698 8.5853 0.434425 8.43442L3.86882 5.00002L0.434425 1.56562C0.284448 1.41559 0.200195 1.21215 0.200195 1.00002C0.200195 0.787885 0.284448 0.584438 0.434425 0.434416Z" fill="#1F242B"/>
              </svg>
            </button>
            <div>
              {selectedBy ? (
                <Avatar color={selectedBy.color} name={selectedBy.name} size={30} outlineWidth={0} />
              ) : null}
            </div>
          </div>
          <div className={styles.noteBody}>
            <div
              className={styles.noteTextareaSize}
              style={{ fontSize }}
            >{text + " "}</div>
            <textarea
              className={styles.noteTextarea}
              style={{ fontSize }}
              placeholder="Write note"
              value={text}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(Note);
