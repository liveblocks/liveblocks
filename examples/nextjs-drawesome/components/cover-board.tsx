"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CoverBoardProps = {
  board: { w: number; h: number };
  children: ReactNode;
};

export function CoverBoard({ board, children }: CoverBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0, left: 0, top: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const update = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        return;
      }
      const scale = Math.max(width / board.w, height / board.h);
      const w = board.w * scale;
      const h = board.h * scale;
      setBox({
        width: w,
        height: h,
        left: (width - w) / 2,
        top: (height - h) / 2,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [board.w, board.h]);

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute"
        style={{
          width: box.width,
          height: box.height,
          left: box.left,
          top: box.top,
        }}
      >
        {children}
      </div>
    </div>
  );
}
