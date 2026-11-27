"use client";

import { DoorOpenIcon, MousePointer2Icon, SquareIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Tool } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// A window as it's drawn on a plan: a frame with the glazing down the middle.
function WindowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="8" width="18" height="8" rx="1" />
      <path d="M3 12h18" />
    </svg>
  );
}

const TOOLS: {
  id: Tool;
  label: string;
  shortcut: string;
  hint: string;
  icon: ReactNode;
}[] = [
  {
    id: "select",
    label: "Select",
    shortcut: "V",
    hint: "Select, move, and reshape",
    icon: <MousePointer2Icon />,
  },
  {
    id: "room",
    label: "Room",
    shortcut: "R",
    hint: "Drag to draw a room",
    icon: <SquareIcon />,
  },
  {
    id: "door",
    label: "Door",
    shortcut: "D",
    hint: "Click a wall to add a door",
    icon: <DoorOpenIcon />,
  },
  {
    id: "window",
    label: "Window",
    shortcut: "W",
    hint: "Click a wall to add a window",
    icon: <WindowIcon />,
  },
];

/** The drawing tools, floating at the bottom of the canvas. */
export function Toolbar({
  tool,
  onToolChange,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Tools"
      className="card-floating absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 p-1"
    >
      {TOOLS.map((item) => {
        const active = item.id === tool;
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={active}
                aria-label={item.label}
                onClick={() => onToolChange(item.id)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:size-4",
                  active
                    ? "bg-brand text-white"
                    : "text-ink-secondary hover:bg-hover hover:text-ink"
                )}
              >
                {item.icon}
                <span className="hidden md:inline">{item.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {item.hint}
              <kbd className="ml-2 font-sans text-background/60">
                {item.shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
