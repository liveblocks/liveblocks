import React from "react";
import styles from "./Avatar.module.css";
import { AVATAR_SIZE } from "../constants";

type Props = {
  src?: string;
  name?: string;
  color?: string;
};

export default function Avatar({ src, name, color }: Props) {
  return (
    <div
      className={styles.avatar}
      style={{
        width: `${AVATAR_SIZE}px`,
        height: `${AVATAR_SIZE}px`,
        boxShadow: color
          ? `0 0 0 1px var(--color-background), 0 0 0 3px ${color}`
          : undefined,
      }}
      data-tooltip={name}
    >
      <img
        src={src}
        height={AVATAR_SIZE}
        width={AVATAR_SIZE}
        className={styles.avatar_image}
        style={{
          border: color ? `1px solid var(--color-background)` : undefined,
        }}
      />
    </div>
  );
}
