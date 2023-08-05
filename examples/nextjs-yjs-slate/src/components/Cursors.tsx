import {
  CursorOverlayData,
  useRemoteCursorOverlayPositions,
} from "@slate-yjs/react";
import React, { CSSProperties, ReactNode, useRef } from "react";
import { Cursor } from "@/types";
import styles from "./Cursors.module.css";

// Create live cursors inside the text editor
export function Cursors({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursors] = useRemoteCursorOverlayPositions<Cursor>({
    containerRef,
  });

  return (
    <div className={styles.cursors} ref={containerRef}>
      {children}
      {cursors.map((cursor) => (
        <Selection key={cursor.clientId} {...cursor} />
      ))}
    </div>
  );
}

function Selection({
  data,
  selectionRects,
  caretPosition,
}: CursorOverlayData<Cursor>) {
  if (!data) {
    return null;
  }

  const selectionStyle: CSSProperties = {
    backgroundColor: data.color,
  };

  return (
    <>
      {selectionRects.map((position, i) => (
        <div
          style={{ ...selectionStyle, ...position }}
          className={styles.selection}
          key={i}
        />
      ))}
      {caretPosition && <Caret caretPosition={caretPosition} data={data} />}
    </>
  );
}

type CaretProps = Pick<CursorOverlayData<Cursor>, "caretPosition" | "data">;

function Caret({ caretPosition, data }: CaretProps) {
  const caretStyle: CSSProperties = {
    ...caretPosition,
    background: data?.color,
  };

  const labelStyle: CSSProperties = {
    transform: "translateY(-100%)",
    background: data?.color,
  };

  return (
    <div style={caretStyle} className={styles.caretMarker}>
      <div className={styles.caret} style={labelStyle}>
        {data?.name}
      </div>
    </div>
  );
}
