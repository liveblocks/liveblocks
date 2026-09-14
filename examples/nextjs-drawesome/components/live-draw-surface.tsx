"use client";

import {
  DrawSurface,
  type DrawingController,
  type Point,
  type Tool,
} from "drawesome";
import { useEffect, useRef, type CSSProperties } from "react";
import type { DraftStroke } from "@/lib/strokes";

export type { DraftStroke };

type LiveDrawSurfaceProps = {
  drawing: DrawingController;
  board: { w: number; h: number };
  background?: string;
  tool: Tool;
  onDraftChange: (draft: DraftStroke | null) => void;
  className?: string;
  style?: CSSProperties;
};

export function LiveDrawSurface({
  drawing,
  board,
  background = "transparent",
  tool,
  onDraftChange,
  className,
  style,
}: LiveDrawSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingNow = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const activePointer = useRef<number | null>(null);
  const sawPen = useRef(false);
  const realPressure = useRef(false);
  const boardRef = useRef(board);
  boardRef.current = board;
  const onDraftRef = useRef(onDraftChange);
  onDraftRef.current = onDraftChange;
  const toolRef = useRef(tool);
  toolRef.current = tool;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const toBoard = (clientX: number, clientY: number) => {
      const { w, h } = boardRef.current;
      const rect = el.getBoundingClientRect();
      const scale = Math.min(rect.width / w, rect.height / h);
      const offsetX = (rect.width - w * scale) / 2;
      const offsetY = (rect.height - h * scale) / 2;
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      };
    };

    const publishDraft = (points: Point[]) => {
      const currentTool = toolRef.current;
      if (points.length === 0) {
        onDraftRef.current(null);
        return;
      }

      const thinned = thinPoints(points, 80);

      if (currentTool.kind === "eraser") {
        onDraftRef.current({
          pen: "pen",
          color: "#000",
          size: currentTool.size,
          opacity: 1,
          points: thinned,
          erase: true,
        });
        return;
      }

      onDraftRef.current({
        pen: currentTool.pen,
        color: currentTool.color,
        size: currentTool.size,
        opacity: currentTool.opacity,
        points: thinned,
        shape: {
          ...currentTool.shape,
          simulatePressure: !realPressure.current,
        },
      });
    };

    const ignore = (e: PointerEvent) => {
      if (e.pointerType === "pen") {
        sawPen.current = true;
      }
      return e.pointerType === "touch" && sawPen.current;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (ignore(e) || activePointer.current !== null) {
        return;
      }
      activePointer.current = e.pointerId;
      drawingNow.current = true;
      realPressure.current = false;
      const { x, y } = toBoard(e.clientX, e.clientY);
      const p: Point = [x, y, e.pressure || 0.5];
      pointsRef.current = [p];
      publishDraft([p]);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (ignore(e)) {
        return;
      }
      if (!drawingNow.current || e.pointerId !== activePointer.current) {
        return;
      }
      if (e.pointerType === "pen" && e.pressure > 0 && e.pressure !== 0.5) {
        realPressure.current = true;
      }
      const { x, y } = toBoard(e.clientX, e.clientY);
      const pts = pointsRef.current;
      const last = pts[pts.length - 1];
      if (last && Math.hypot(x - last[0], y - last[1]) < 1.1) {
        return;
      }
      const next: Point[] = [...pts, [x, y, e.pressure || 0.5]];
      pointsRef.current = next;
      publishDraft(next);
    };

    const clearDraft = (e: PointerEvent) => {
      if (e.pointerId !== activePointer.current) {
        return;
      }
      drawingNow.current = false;
      activePointer.current = null;
      pointsRef.current = [];
      onDraftRef.current(null);
    };

    el.addEventListener("pointerdown", onPointerDown, true);
    el.addEventListener("pointermove", onPointerMove, true);
    el.addEventListener("pointerup", clearDraft);
    el.addEventListener("pointercancel", clearDraft);
    el.addEventListener("pointerleave", clearDraft);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("pointermove", onPointerMove, true);
      el.removeEventListener("pointerup", clearDraft);
      el.removeEventListener("pointercancel", clearDraft);
      el.removeEventListener("pointerleave", clearDraft);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <DrawSurface
        drawing={drawing}
        board={board}
        background={background}
        tool={tool}
        className={className}
        style={{ width: "100%", height: "100%", ...style }}
      />
    </div>
  );
}

function thinPoints(points: Point[], max: number): Point[] {
  if (points.length <= max) {
    return points;
  }

  const out: Point[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max - 1; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  out.push(points[points.length - 1]!);
  return out;
}
