import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { getContrastingColor } from "../utils/getContrastingColor";

type BothProps = {
  variant?: "basic" | "name";
  x: number;
  y: number;
  color?: string;
}

type BasicCursorProps = BothProps & {
  variant?: "basic";
  name: never;
};

type NameCursorProps = BothProps & {
  variant: "name";
  name: string;
};

type CursorProps = BasicCursorProps | NameCursorProps;

export default function Cursor({ variant = "basic", x, y, color = "", name }: CursorProps) {
  return (
    <motion.div
      className="absolute top-0 left-0 pointer-events-none select-none"
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
      {variant === "basic" ? (
        <BasicCursor color={color} />
      ) : null}
      {variant === "name" ? (
        <NameCursor color={color} name={name} />
      ) : null}
    </motion.div>
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
  )
}

function NameCursor({ color, name }: { color: string, name: string }){
  const textColor = useMemo(() => color ? getContrastingColor(color) : undefined, [color]);
  return (
    <div className="relative">
      <svg className="absolute left-0 top-0" width="32" height="44" viewBox="0 0 24 36" fill="none">
        <path
          fill={color}
          d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
        />
      </svg>
      <div
        className="absolute top-4 left-4 whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium overflow-hidden"
        style={{ background: color, color: textColor }}
      >
        <div
          style={{
            maskImage: "linear-gradient(to bottom right, transparent, #fff)",
            WebkitMaskImage: "linear-gradient(to bottom right, transparent, #fff)",
            backgroundColor: color,
          }}
          className="-hue-rotate-60 absolute inset-0"
        />
        <div className="z-10 relative">
          {name}
        </div>
      </div>
    </div>
  )
}
