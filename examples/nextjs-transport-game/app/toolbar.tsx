"use client";

import {
  MousePointer2,
  Signpost,
  TrainTrack,
  Trash2,
  Truck,
  Warehouse,
} from "lucide-react";
import { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TRACK } from "@/game/constants";
import { formatMoney } from "@/game/economy";
import type { Tool } from "@/game/types";

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
    detail: "Move around and inspect stations",
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
    id: "road-station",
    label: "Road stop",
    detail: `For buses and trucks · ${formatMoney(TRACK.road.stationCost)}`,
    shortcut: "4",
    icon: Signpost,
  },
  {
    id: "rail-station",
    label: "Train station",
    detail: formatMoney(TRACK.rail.stationCost),
    shortcut: "5",
    icon: Warehouse,
  },
  {
    id: "vehicle",
    label: "Vehicle",
    detail: `Click two of your stations · from ${formatMoney(TRACK.road.vehicleCost)}`,
    shortcut: "6",
    icon: Truck,
  },
  {
    id: "bulldoze",
    label: "Clear",
    detail: "Remove your own tracks and stations",
    shortcut: "7",
    icon: Trash2,
  },
];

export function Toolbar({
  tool,
  onSelect,
}: {
  tool: Tool;
  onSelect: (tool: Tool) => void;
}) {
  return (
    <div className="absolute top-3 left-3 flex flex-col gap-1 rounded-lg bg-white p-1 shadow ring-1 ring-neutral-950/5">
      {TOOLS.map(({ id, label, detail, shortcut, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <Button
              variant={tool === id ? "default" : "ghost"}
              size="icon-sm"
              aria-label={label}
              aria-pressed={tool === id}
              onClick={() => onSelect(id)}
            >
              <Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <span className="font-medium">{label}</span>
            <span className="ml-1.5 opacity-60">{shortcut}</span>
            <div className="opacity-70">{detail}</div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
