import React, { useMemo } from "react";
import { getContrastingColor } from "../utils/getContrastingColor";
import styles from "./Cursor.module.css";

type BothProps = {
  variant?: "basic" | "name";
  x: number;
  y: number;
  color?: string;
};

type BasicCursorProps = BothProps & {
  variant?: "basic";
  name: never;
};

type NameCursorProps = BothProps & {
  variant: "name";
  name: string;
};

type CursorProps = BasicCursorProps | NameCursorProps;

/**
 * Cursors can be simple colored cursors, or colored cursors with a name alongside.
 * They're animated with CSS transitions.
 */
export default function Cursor({
  variant = "basic",
  x,
  y,
  color = "",
  name,
}: CursorProps) {
  return (
    <div
      className={styles.cursor}
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {variant === "basic" ? <BasicCursor color={color} /> : null}
      {variant === "name" ? <NameCursor color={color} name={name} /> : null}
    </div>
  );
}

function BasicCursor({ color }: { color: string }) {
  return (
    <svg width="32" height="44" viewBox="0 0 24 36" fill="none">
      <path
        fill={color}
        d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
      />
    </svg>
  );
}

function NameCursor({ color, name }: { color: string; name: string }) {
  const textColor = useMemo(
    () => (color ? getContrastingColor(color) : undefined),
    [color]
  );
  return (
    <div className={styles.nameWrapper}>
      <svg
        className={styles.cursorSvg}
        width="32"
        height="44"
        viewBox="0 0 24 36"
        fill="none"
      >
        <path
          fill={color}
          d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
        />
      </svg>
      <div
        className={styles.namePill}
        style={{ background: color, color: textColor }}
      >
        <div
          style={{
            maskImage: "linear-gradient(to bottom right, transparent, #fff)",
            WebkitMaskImage:
              "linear-gradient(to bottom right, transparent, #fff)",
            backgroundColor: color,
          }}
          className={styles.namePillBackground}
        />
        <div className={styles.namePillName}>{name}</div>
      </div>
    </div>
  );
}
