"use client";

import clsx from "clsx";
import {
  Code2,
  Circle,
  Hand,
  ImageIcon,
  MousePointer2,
  PanelsTopLeft,
  PenLine,
  Slash,
  Square,
  Shapes,
  SquareDashedMousePointer,
  Type,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { GeoShapeGeoStyle, type Editor } from "tldraw";

function ToolButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={clsx(
        "h-8.5 w-8.5 rounded-md flex items-center justify-center transition",
        active
          ? "bg-sky-50 text-sky-700"
          : "bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  editor,
  sidebarOpen,
  setSidebarOpen,
  htmlToolOpen,
  setHtmlToolOpen,
}: {
  editor: Editor | null;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  htmlToolOpen: boolean;
  setHtmlToolOpen: (value: boolean) => void;
}) {
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [shapePreset, setShapePreset] = useState<
    "rectangle" | "ellipse" | "line" | "arrow"
  >("rectangle");

  const setGeoShape = (geo: "rectangle" | "ellipse") => {
    if (!editor) {
      return;
    }
    editor.setCurrentTool("geo");
    editor.setStyleForNextShapes(GeoShapeGeoStyle, geo);
    setShapePreset(geo);
    setShapeMenuOpen(false);
  };

  const setLineShape = () => {
    if (!editor) {
      return;
    }
    editor.setCurrentTool("line");
    setShapePreset("line");
    setShapeMenuOpen(false);
  };

  const setArrowShape = () => {
    if (!editor) {
      return;
    }
    editor.setCurrentTool("arrow");
    setShapePreset("arrow");
    setShapeMenuOpen(false);
  };

  return (
    <div className="absolute left-3 top-3 z-30 flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <ToolButton
        title={sidebarOpen ? "Hide panel" : "Show panel"}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <PanelsTopLeft size={18} />
      </ToolButton>
      <ToolButton title="Select" onClick={() => editor?.setCurrentTool("select")}>
        <MousePointer2 size={18} />
      </ToolButton>
      <ToolButton
        title="Marquee select"
        onClick={() => editor?.setCurrentTool("select")}
      >
        <SquareDashedMousePointer size={18} />
      </ToolButton>
      <ToolButton disabled title="Image (coming soon)">
        <ImageIcon size={18} />
      </ToolButton>
      <ToolButton title="Hand" onClick={() => editor?.setCurrentTool("hand")}>
        <Hand size={18} />
      </ToolButton>
      <div className="relative">
        <ToolButton
          title="Shapes"
          onClick={() => setShapeMenuOpen((open) => !open)}
        >
          <Shapes size={18} />
        </ToolButton>
        {shapeMenuOpen ? (
          <div className="absolute left-full top-1/2 ml-2.5 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title="Rectangle"
                className={clsx(
                  "grid h-8.5 w-8.5 place-items-center rounded-lg transition",
                  shapePreset === "rectangle"
                    ? "bg-sky-50 text-sky-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                )}
                onClick={() => setGeoShape("rectangle")}
              >
                <Square size={20} />
              </button>
              <button
                type="button"
                title="Circle"
                className={clsx(
                  "grid h-8.5 w-8.5 place-items-center rounded-lg transition",
                  shapePreset === "ellipse"
                    ? "bg-sky-50 text-sky-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                )}
                onClick={() => setGeoShape("ellipse")}
              >
                <Circle size={20} />
              </button>
              <button
                type="button"
                title="Line"
                className={clsx(
                  "grid h-8.5 w-8.5 place-items-center rounded-lg transition",
                  shapePreset === "line"
                    ? "bg-sky-50 text-sky-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                )}
                onClick={setLineShape}
              >
                <Slash size={20} />
              </button>
              <button
                type="button"
                title="Arrow"
                className={clsx(
                  "grid h-8.5 w-8.5 place-items-center rounded-lg transition",
                  shapePreset === "arrow"
                    ? "bg-sky-50 text-sky-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                )}
                onClick={setArrowShape}
              >
                <ArrowUpRight size={20} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <ToolButton title="Text" onClick={() => editor?.setCurrentTool("text")}>
        <Type size={18} />
      </ToolButton>
      <ToolButton title="Draw" onClick={() => editor?.setCurrentTool("draw")}>
        <PenLine size={18} />
      </ToolButton>
      <ToolButton
        active={htmlToolOpen}
        title="HTML tool"
        onClick={() => setHtmlToolOpen(!htmlToolOpen)}
      >
        <Code2 size={18} />
      </ToolButton>
    </div>
  );
}
