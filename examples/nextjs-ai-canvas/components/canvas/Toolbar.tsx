"use client";

import clsx from "clsx";
import {
  Code2,
  Hand,
  ImageIcon,
  MousePointer2,
  PanelsTopLeft,
  PenLine,
  Shapes,
  SquareDashedMousePointer,
  Type,
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
        "h-10 w-10 rounded-xl border flex items-center justify-center transition",
        active
          ? "bg-neutral-900 border-neutral-900 text-white"
          : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
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

  const setGeoShape = (geo: "rectangle" | "ellipse" | "triangle") => {
    if (!editor) {
      return;
    }
    editor.setCurrentTool("geo");
    editor.setStyleForNextShapes(GeoShapeGeoStyle, geo);
    setShapeMenuOpen(false);
  };

  return (
    <div className="absolute left-4 top-4 z-30 flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white/90 p-2 shadow-md backdrop-blur">
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
          <div className="absolute left-full top-0 ml-2 flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-2 shadow-md">
            <button
              type="button"
              className="px-3 py-1.5 text-left text-sm rounded-md hover:bg-neutral-100"
              onClick={() => setGeoShape("rectangle")}
            >
              Rectangle
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-left text-sm rounded-md hover:bg-neutral-100"
              onClick={() => setGeoShape("ellipse")}
            >
              Ellipse
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-left text-sm rounded-md hover:bg-neutral-100"
              onClick={() => setGeoShape("triangle")}
            >
              Triangle
            </button>
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
