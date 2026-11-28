"use client";

import {
  Anchor,
  MousePointer2,
  Pause,
  Play,
  Redo2,
  Signpost,
  TrainTrack,
  Trash2,
  Truck,
  Undo2,
  Warehouse,
  Waves,
} from "lucide-react";
import { ComponentType } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Window } from "@/components/window";
import { BUILDINGS, TRACK, TRANSPORT } from "@/game/constants";
import { formatMoney } from "@/game/economy";
import type { Tool } from "@/game/types";
import { useIsMac } from "@/hooks/use-is-mac";

function RoadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 21 9 3" />
      <path d="m20 21-5-18" />
      <path d="M12 4v2" />
      <path d="M12 11v2" />
      <path d="M12 18v2" />
    </svg>
  );
}

export const TOOLS: {
  id: Tool;
  label: string;
  detail: string;
  shortcut: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    id: "select",
    label: "Select",
    detail: "Move around, inspect stations and towns",
    shortcut: "1",
    icon: MousePointer2,
  },
  {
    id: "road",
    label: "Road",
    detail: `${formatMoney(TRACK.road.cost)} per tile`,
    shortcut: "2",
    icon: RoadIcon,
  },
  {
    id: "rail",
    label: "Railway",
    detail: `${formatMoney(TRACK.rail.cost)} per tile`,
    shortcut: "3",
    icon: TrainTrack,
  },
  {
    id: "canal",
    label: "Canal",
    detail: `Dig water for ships across land · ${formatMoney(TRACK.canal.cost)} per tile`,
    shortcut: "4",
    icon: Waves,
  },
  {
    id: "road-station",
    label: "Road stop",
    detail: `For buses and trucks · ${formatMoney(TRANSPORT.road.stationCost)}`,
    shortcut: "5",
    icon: Signpost,
  },
  {
    id: "rail-station",
    label: "Train station",
    detail: formatMoney(TRANSPORT.rail.stationCost),
    shortcut: "6",
    icon: Warehouse,
  },
  {
    id: "water-station",
    label: "Dock",
    detail: `For ships, on the water by the shore or on a canal · ${formatMoney(TRANSPORT.water.stationCost)}`,
    shortcut: "7",
    icon: Anchor,
  },
  {
    id: "vehicle",
    label: "Vehicle",
    detail: `Click two of your stations of the same kind · from ${formatMoney(TRANSPORT.road.vehicleCost)}`,
    shortcut: "8",
    icon: Truck,
  },
  {
    id: "bulldoze",
    label: "Clear",
    detail: `Remove your tracks, canals and stations · Demolish buildings, from ${formatMoney(BUILDINGS[0].demolishCost)}`,
    shortcut: "9",
    icon: Trash2,
  },
];

export type History = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
};

export function Toolbar({
  tool,
  history,
  paused,
  onSelect,
  onTogglePause,
}: {
  tool: Tool;
  history: History;
  paused: boolean;
  onSelect: (tool: Tool) => void;
  onTogglePause: () => void;
}) {
  const PauseIcon = paused ? Play : Pause;
  const isMac = useIsMac();
  const steps = [
    {
      label: "Undo",
      shortcut: isMac ? "⌘Z" : "Ctrl+Z",
      icon: Undo2,
      enabled: history.canUndo,
      run: history.undo,
    },
    {
      label: "Redo",
      shortcut: isMac ? "⇧⌘Z" : "Ctrl+Shift+Z",
      icon: Redo2,
      enabled: history.canRedo,
      run: history.redo,
    },
  ];

  return (
    <Window title="Build">
      <div className="flex gap-px pt-[3px]">
        {TOOLS.map(({ id, label, detail, shortcut, icon: Icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="win-button size-8 p-0"
                aria-label={label}
                aria-pressed={tool === id}
                onClick={() => onSelect(id)}
              >
                <Icon className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              <span className="font-bold">{label}</span> ({shortcut})
              <div>{detail}</div>
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="win-divider mx-0.5" />
        {steps.map(({ label, shortcut, icon: Icon, enabled, run }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="win-button size-8 p-0"
                aria-label={label}
                disabled={!enabled}
                onClick={run}
              >
                <Icon className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              <span className="font-bold">{label}</span> ({shortcut})
              <div>Only what your company built, bought or cleared</div>
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="win-divider mx-0.5" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="win-button size-8 p-0"
              aria-label={paused ? "Resume the game" : "Pause the game"}
              aria-pressed={paused}
              onClick={onTogglePause}
            >
              <PauseIcon className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            <span className="font-bold">{paused ? "Resume" : "Pause"}</span> (P)
            <div>
              Stops vehicles, cargo and towns for everyone. You can still build.
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </Window>
  );
}
