"use client";

import { LiveList } from "@liveblocks/client";
import {
  useMutation,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { AvatarStack, Cursors } from "@liveblocks/react-ui";
import {
  PEN_BY_ID,
  PENS,
  Toolbar,
  ToolIcon,
  toPng,
  useDrawing,
  type PenId,
  type Stroke,
  type ToolId,
  type ToolState,
} from "drawesome";
import { DownloadIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CoverBoard } from "@/components/cover-board";
import { DraftStrokesOverlay } from "@/components/draft-strokes";
import { HelpButton } from "@/components/help-button";
import { LiveDrawSurface } from "@/components/live-draw-surface";
import { Button } from "@/components/ui/button";
import { BOARD } from "@/lib/board";
import { remapNewStrokeIds, strokesEqual } from "@/lib/strokes";

const NARROW_PENS = [
  "pencil",
  "pen",
  "marker",
  "highlighter",
  "brush",
] as const satisfies readonly PenId[];

const TOP_BAR_TRANSITION = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.8,
} as const;

export function CollaborativeDraw() {
  const connectionId = useSelf((me) => me.connectionId);
  const storageStrokes = useStorage((root) => root.strokes);
  const updateMyPresence = useUpdateMyPresence();
  const applyingRemoteRef = useRef(false);
  const drawingRef = useRef<ReturnType<typeof useDrawing> | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const drawing = useDrawing(storageStrokes as Stroke[]);
  drawingRef.current = drawing;

  const [tool, setTool] = useState<ToolState>({
    active: "pen",
    color: "#111111",
    size: PEN_BY_ID.pen.defaultSize,
    opacity: PEN_BY_ID.pen.defaultOpacity,
    eraserSize: 28,
  });
  const [ink, setInk] = useState("#111111");
  const [inks, setInks] = useState<Partial<Record<PenId, string>>>({});
  const tuned = useRef<Partial<Record<PenId, { size: number; opacity: number }>>>(
    {}
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const drawing = drawingRef.current;
      if (!drawing || isTypingTarget(document.activeElement)) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          drawing.redo();
        } else {
          drawing.undo();
        }
        return;
      }

      if (mod && key === "y") {
        e.preventDefault();
        drawing.redo();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Layout so Storage strokes paint before the draft holdover drops.
  useLayoutEffect(() => {
    if (strokesEqual(drawing.strokes, storageStrokes as Stroke[])) {
      return;
    }
    applyingRemoteRef.current = true;
    drawing.reset(storageStrokes as Stroke[]);
    queueMicrotask(() => {
      applyingRemoteRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on storage only
  }, [storageStrokes]);

  const syncStrokes = useMutation(
    ({ storage }, next: Stroke[]) => {
      const list = storage.get("strokes");
      const existingIds = new Set<number>();
      for (let i = 0; i < list.length; i++) {
        const stroke = list.get(i);
        if (stroke) {
          existingIds.add(stroke.id);
        }
      }

      const remapped = remapNewStrokeIds(next, connectionId, existingIds);
      applyStrokeDiff(list, remapped);
      return remapped;
    },
    [connectionId]
  );

  useEffect(() => {
    if (applyingRemoteRef.current) {
      return;
    }
    if (strokesEqual(drawing.strokes, storageStrokes as Stroke[])) {
      return;
    }

    const remapped = syncStrokes(drawing.strokes);
    if (!strokesEqual(remapped, drawing.strokes)) {
      applyingRemoteRef.current = true;
      drawing.update(remapped);
      queueMicrotask(() => {
        applyingRemoteRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drive from local strokes
  }, [drawing.strokes, syncStrokes]);

  function inkFor(id: PenId) {
    return inks[id] ?? PEN_BY_ID[id].defaultColor ?? ink;
  }

  function select(id: ToolId) {
    if (id === "eraser") {
      setTool((t) => ({ ...t, active: "eraser" }));
      return;
    }
    const preset = PEN_BY_ID[id];
    const last = tuned.current[id];
    setTool((t) => ({
      ...t,
      active: id,
      size: last?.size ?? preset.defaultSize,
      opacity: last?.opacity ?? preset.defaultOpacity,
      color: inkFor(id),
    }));
  }

  function patch(p: Partial<ToolState>) {
    setTool((t) => {
      if (p.color && t.active !== "eraser") {
        if (PEN_BY_ID[t.active as PenId]?.defaultColor) {
          setInks((m) => ({ ...m, [t.active as PenId]: p.color }));
        } else {
          setInk(p.color);
        }
      }
      if (
        (p.size !== undefined || p.opacity !== undefined) &&
        t.active !== "eraser"
      ) {
        const id = t.active as PenId;
        tuned.current[id] = {
          size: p.size ?? t.size,
          opacity: p.opacity ?? t.opacity,
        };
      }
      return { ...t, ...p };
    });
  }

  const surfaceTool =
    tool.active === "eraser"
      ? { kind: "eraser" as const, size: tool.eraserSize }
      : {
          kind: "pen" as const,
          pen: tool.active as PenId,
          color: tool.color,
          size: tool.size,
          opacity: tool.opacity,
        };

  const pens = narrow ? NARROW_PENS.map((id) => PEN_BY_ID[id]) : PENS;

  async function handleDownload() {
    const blob = await toPng(drawing.strokes, BOARD.w, BOARD.h, null, 2);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawesome.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="relative flex h-dvh w-full flex-col">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-center p-3 sm:p-4">
        <motion.div
          layout
          initial={false}
          transition={TOP_BAR_TRANSITION}
          className="pointer-events-auto w-max rounded-full bg-linear-to-b from-[#fbfaf9] to-[#f1efec] px-3 py-2 shadow-custom"
          style={{ borderRadius: 9999 }}
        >
          <motion.div layout="position" className="flex items-center gap-1">
            <AvatarStack size={28} max={5} />
            <span className="mx-2 h-4 w-px bg-border" />
            <Button onClick={handleDownload}>
              <DownloadIcon className="opacity-70" />
              Export as PNG
            </Button>
            <HelpButton />
          </motion.div>
        </motion.div>
      </header>

      <Cursors className="drawesome-paper relative min-h-0 flex-1">
        <div className="sd absolute inset-0" data-theme="light" data-depth="regular">
          <CoverBoard board={BOARD}>
            <LiveDrawSurface
              drawing={drawing}
              board={BOARD}
              background="transparent"
              tool={surfaceTool}
              onDraftChange={(draft) => updateMyPresence({ draft })}
            />
            <DraftStrokesOverlay strokes={drawing.strokes} />
          </CoverBoard>

          <div
            className="Draw_toolbar"
            data-placement={narrow ? "left" : "bottom"}
            data-align="center"
            style={{ ["--sd-inset" as string]: "1.25rem" }}
          >
            <Toolbar
              placement={narrow ? "left" : "bottom"}
              collapsed={collapsed}
              onCollapse={() => setCollapsed(true)}
              onExpand={() => setCollapsed(false)}
              icon={
                <ToolIcon
                  id={tool.active === "eraser" ? "eraser" : tool.active}
                  color={tool.color}
                  look="studio"
                  size={42}
                />
              }
              tool={tool}
              inkFor={inkFor}
              pens={pens}
              eraser
              look="studio"
              controls={
                narrow
                  ? {
                      undo: true,
                      clear: true,
                      opacity: false,
                      custom: false,
                    }
                  : undefined
              }
              onSelect={select}
              onChange={patch}
              canUndo={drawing.canUndo}
              canRedo={drawing.canRedo}
              onUndo={drawing.undo}
              onRedo={drawing.redo}
              onClear={drawing.clear}
              hasStrokes={drawing.strokes.length > 0}
            />
          </div>
        </div>
      </Cursors>
    </div>
  );
}

function isTypingTarget(el: Element | null) {
  if (!el || el === document.body) {
    return false;
  }

  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  if (el instanceof HTMLElement && el.isContentEditable) {
    return true;
  }

  return el.closest("[role='dialog']") !== null;
}

function applyStrokeDiff(list: LiveList<Stroke>, next: Stroke[]) {
  const nextIds = new Set(next.map((stroke) => stroke.id));

  for (let i = list.length - 1; i >= 0; i--) {
    const existing = list.get(i);
    if (existing && !nextIds.has(existing.id)) {
      list.delete(i);
    }
  }

  for (const stroke of next) {
    let index = -1;
    for (let i = 0; i < list.length; i++) {
      if (list.get(i)?.id === stroke.id) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      list.push(stroke);
      continue;
    }

    const current = list.get(index);
    if (current && JSON.stringify(current) !== JSON.stringify(stroke)) {
      list.set(index, stroke);
    }
  }
}
