import styles from "./Avatar.module.css";
import { CSSProperties } from "react";

export function Avatar({
  src,
  name,
  tooltip = true,
  size = 36,
  borderSize = 0,
  style = {},
}: {
  src: string;
  name: string;
  tooltip?: boolean;
  size?: number;
  borderSize?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className={styles.avatar}
      data-tooltip={tooltip ? name : undefined}
      style={
        {
          "--avatar-size": size,
          "--border-size": borderSize,
          ...style,
        } as CSSProperties
      }
    >
      <img
        width={size}
        height={size}
        alt={name}
        src={src}
        className={styles.avatar_picture}
        data-tooltip={name}
        draggable={false}
      />
    </div>
  );
}
