import React from "react";
import { motion } from "framer-motion";

type Props = {
  color: string;
  x: number;
  y: number;
};

export default function Cursor({ color, x, y }: Props) {
  return (
    <motion.div
      style={{
        position: "absolute",
        top: "0",
        left: "0",
      }}
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
      <svg width="32" height="44" viewBox="0 0 24 36" fill="none">
        <path
          fill={color}
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        />
      </svg>
    </motion.div>
  );
}
