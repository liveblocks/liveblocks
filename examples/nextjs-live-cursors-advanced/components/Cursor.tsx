import React, { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { getContrastingColor } from "../utils/getContrastingColor";
import styles from "./Cursor.module.css";

type AllProps = {
  variant?: "basic" | "name" | "avatar";
  x: number;
  y: number;
  color: [string, string];
};

type BasicCursorProps = AllProps & {
  variant?: "basic";
  name?: never;
  picture?: never;
  size?: never;
};

type NameCursorProps = AllProps & {
  variant: "name";
  name: string;
  picture?: never;
  size?: never;
};

type AvatarCursorProps = AllProps & {
  variant: "avatar";
  picture: string;
  name?: never;
  size?: number;
};

type CursorProps = BasicCursorProps | NameCursorProps | AvatarCursorProps;

export default function Cursor ({
  variant = "basic",
  x,
  y,
  color = ["", ""],
  name = "",
  picture = "",
  size = 36,
}: CursorProps) {
  return (
    <motion.div
      className={styles.cursor}
      initial={{ x, y }}
      animate={{ x, y }}
      transition={{
        type: "spring",
        bounce: 0.6,
        damping: 30,
        mass: 0.8,
        stiffness: 350,
        restSpeed: 0.01,
      }}
    >
      {variant === "basic" ? <BasicCursor color={color} /> : null}
      {variant === "name" ? <NameCursor color={color} name={name} /> : null}
      {variant === "avatar" ? <AvatarCursor color={color} picture={picture} size={size} /> : null}
    </motion.div>
  );
}

function BasicCursor ({ color }: Pick<BasicCursorProps, "color">) {
  return (
    <svg width="32" height="44" viewBox="0 0 24 36" fill="none">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="500%" y2="0%">
          <stop offset="0%" stopColor={color[0]} />
          <stop offset="100%" stopColor={color[1]} />
        </linearGradient>
      </defs>
      <path
        fill="url(#gradient)"
        d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
      />
    </svg>
  );
}

function NameCursor ({
  color,
  name,
}: Pick<NameCursorProps, "color" | "name">) {
  const textColor = useMemo(
    () => (color ? getContrastingColor(color[1]) : undefined),
    [color],
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
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="500%" y2="0%">
            <stop offset="0%" stopColor={color[0]} />
            <stop offset="100%" stopColor={color[1]} />
          </linearGradient>
        </defs>
        <path
          fill="url(#gradient)"
          d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
        />
      </svg>
      <div
        className={styles.namePill}
        style={{
          backgroundImage: `linear-gradient(to bottom right, ${color[0]}, ${color[1]})`,
          color: textColor,
        }}
      >
        <div className={styles.namePillName}>{name}</div>
      </div>
    </div>
  );
}

function AvatarCursor ({
  color,
  picture,
  size,
}: Pick<AvatarCursorProps, "color" | "picture" | "size">) {
  return (
    <div className={styles.avatarWrapper}>
      <svg
        className={styles.cursorSvg}
        width="32"
        height="44"
        viewBox="0 0 24 36"
        fill="none"
      >
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="500%" y2="0%">
            <stop offset="0%" stopColor={color[0]} />
            <stop offset="100%" stopColor={color[1]} />
          </linearGradient>
        </defs>
        <path
          fill="url(#gradient)"
          d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
        />
      </svg>
      <div
        className={styles.avatar}
        style={{
          outlineColor: color[0],
          width: size + "px",
          height: size + "px",
        }}
      >
        <Image
          src={picture}
          height={size}
          width={size}
          alt=""
        />
      </div>
    </div>
  );
}
