"use client";

import {
  Anchor,
  FastForward,
  type LucideIcon,
  MousePointer2,
  Pause,
  Play,
  Redo2,
  ScanEye,
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
import { type Speed, SPEEDS } from "@/game/clock";
import {
  BUILDINGS,
  STREET_REMOVAL_COST,
  TRACK,
  TRANSPORT,
} from "@/game/constants";
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
    detail: `Remove your tracks, canals and stations · Clear town streets, ${formatMoney(STREET_REMOVAL_COST)} a tile, and buildings, from ${formatMoney(BUILDINGS[0].demolishCost)}`,
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

// The speed of the game is the same for everyone: one of these is always
// pressed in
const SPEED_BUTTONS: {
  id: Speed;
  label: string;
  detail: string;
  shortcut: string | null;
  icon: LucideIcon;
}[] = [
  {
    id: "paused",
    label: "Pause",
    detail:
      "Stops vehicles, cargo and towns for everyone. You can still build.",
    shortcut: "P",
    icon: Pause,
  },
  {
    id: "play",
    label: "Play",
    detail: "The game runs at its normal speed, for everyone",
    shortcut: null,
    icon: Play,
  },
  {
    id: "fast",
    label: "Fast forward",
    detail: `Everything goes ${SPEEDS.fast} times as fast, for everyone`,
    shortcut: "F",
    icon: FastForward,
  },
];

export function Toolbar({
  tool,
  history,
  speed,
  xray,
  onSelect,
  onSpeed,
  onXray,
}: {
  tool: Tool;
  history: History;
  speed: Speed;
  xray: boolean;
  onSelect: (tool: Tool) => void;
  onSpeed: (speed: Speed) => void;
  onXray: (xray: boolean) => void;
}) {
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
        {SPEED_BUTTONS.map(({ id, label, detail, shortcut, icon: Icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="win-button size-8 p-0"
                aria-label={label}
                aria-pressed={speed === id}
                onClick={() => onSpeed(id)}
              >
                <Icon className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              <span className="font-bold">{label}</span>
              {shortcut ? ` (${shortcut})` : null}
              <div>{detail}</div>
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="win-divider mx-0.5" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="win-button size-8 p-0"
              aria-label="X-ray"
              aria-pressed={xray}
              onClick={() => onXray(!xray)}
            >
              <ScanEye className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            <span className="font-bold">X-ray</span> (X)
            <div>
              See through buildings, to find the stations and tracks behind
              them. Only you see this.
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </Window>
  );
}
