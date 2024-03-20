import clsx from "clsx";
import { ComponentProps, useMemo } from "react";
import { getContrastingColor } from "../../utils";
import styles from "./Cursor.module.css";

interface Props extends Omit<ComponentProps<"div">, "color"> {
  color: string;
  name: string;
  x: number;
  y: number;
}

export function Cursor({
  x,
  y,
  color,
  name,
  className,
  style,
  ...props
}: Props) {
  const textColor = useMemo(
    () => (color ? getContrastingColor(color) : undefined),
    [color]
  );

  return (
    <div
      className={clsx(className, styles.cursor)}
      style={{ transform: `translate(${x}px, ${y}px`, ...style }}
      {...props}
    >
      <svg
        className={styles.pointer}
        fill="none"
        height="44"
        viewBox="0 0 24 36"
        width="32"
      >
        <path
          d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
          fill={color}
        />
      </svg>
      <div
        className={styles.name}
        style={{
          background: color,
          color: textColor,
        }}
      >
        {name}
      </div>
    </div>
  );
}
