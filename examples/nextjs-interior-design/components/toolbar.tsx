"use client";

import { DoorOpenIcon, MousePointer2Icon, SquareIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Tool } from "@/lib/plan";
import { Toggle, ToggleGroup } from "./ui/toggle";
import { Toolbar as ToolbarRoot } from "./ui/toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipShortcut,
  TooltipTrigger,
} from "./ui/tooltip";

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

// Each tool's key is bound in the canvas, with the rest of the shortcuts.
export const TOOLS: {
  id: Tool;
  label: string;
  shortcut: string;
  hint: string;
  icon: ReactNode;
}[] = [
  {
    id: "select",
    label: "Select",
    shortcut: "v",
    hint: "Select, move, and reshape",
    icon: <MousePointer2Icon />,
  },
  {
    id: "room",
    label: "Room",
    shortcut: "r",
    hint: "Drag to draw a room",
    icon: <SquareIcon />,
  },
  {
    id: "door",
    label: "Door",
    shortcut: "d",
    hint: "Click a wall to add a door",
    icon: <DoorOpenIcon />,
  },
  {
    id: "window",
    label: "Window",
    shortcut: "w",
    hint: "Click a wall to add a window",
    icon: <WindowIcon />,
  },
];

/**
 * The drawing tools, floating at the bottom of the canvas: a toolbar holding
 * a group of toggles where exactly one is on. It's a single tab stop, and
 * the arrow keys move between the tools.
 */
export function Toolbar({
  tool,
  onToolChange,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
}) {
  return (
    <ToolbarRoot
      aria-label="Tools"
      className="card-floating absolute bottom-3 left-1/2 -translate-x-1/2 p-1"
    >
      <ToggleGroup
        aria-label="Tool"
        value={[tool]}
        deselectable={false}
        onValueChange={([next]) => {
          const picked = TOOLS.find((item) => item.id === next);
          if (picked) {
            onToolChange(picked.id);
          }
        }}
        className="flex items-center gap-0.5"
      >
        {TOOLS.map((item) => (
          <Tooltip key={item.id} shortcut={item.shortcut}>
            <TooltipTrigger
              render={
                <Toggle
                  value={item.id}
                  aria-label={item.label}
                  className="h-8 gap-1.5 rounded-md px-2 text-[13px] font-medium text-ink-secondary hover:bg-hover hover:text-ink data-pressed:bg-brand data-pressed:text-white [&_svg]:size-4"
                />
              }
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {item.hint}
              <TooltipShortcut />
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </ToolbarRoot>
  );
}
