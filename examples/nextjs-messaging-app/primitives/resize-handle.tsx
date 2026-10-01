"use client";

import clsx from "clsx";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { PanelWidthConfig } from "@/lib/panel-width";

const KEYBOARD_STEP = 16;

type DragState = {
  pointerId: number;
  startX: number;
  startWidth: number;
};

export function ResizeHandle({
  edge,
  width,
  config,
  label,
  onWidthChange,
  className,
}: {
  edge: "left" | "right";
  width: number;
  config: PanelWidthConfig;
  label: string;
  onWidthChange: (width: number) => void;
  className?: string;
}) {
  const dragRef = useRef<DragState | null>(null);
  const direction = edge === "right" ? 1 : -1;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    onWidthChange(drag.startWidth + (event.clientX - drag.startX) * direction);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const grow = edge === "right" ? "ArrowRight" : "ArrowLeft";
    const shrink = edge === "right" ? "ArrowLeft" : "ArrowRight";
    let next: number | null = null;
    if (event.key === grow) {
      next = width + KEYBOARD_STEP;
    } else if (event.key === shrink) {
      next = width - KEYBOARD_STEP;
    } else if (event.key === "Home") {
      next = config.minWidth;
    } else if (event.key === "End") {
      next = config.maxWidth;
    }
    if (next !== null) {
      event.preventDefault();
      onWidthChange(next);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={config.minWidth}
      aria-valuemax={config.maxWidth}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onWidthChange(config.defaultWidth)}
      onKeyDown={handleKeyDown}
      className={clsx(
        "group absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none select-none outline-none",
        edge === "right" ? "-right-1" : "-left-1",
        className
      )}
    >
      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-brand-400 group-focus-visible:bg-brand-500 group-active:bg-brand-500" />
    </div>
  );
}
