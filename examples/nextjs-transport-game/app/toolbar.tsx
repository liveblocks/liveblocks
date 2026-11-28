"use client";

import {
  Anchor,
  BusFront,
  ChevronDown,
  FastForward,
  type LucideIcon,
  MousePointer2,
  Pause,
  Play,
  Redo2,
  ScanEye,
  Ship,
  Signpost,
  TrainFront,
  TrainTrack,
  Trash2,
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
  SIGNALS,
  STREET_REMOVAL_COST,
  TRACK,
  TRANSPORT,
} from "@/game/constants";
import { formatMoney } from "@/game/economy";
import type { SignalKind, Tool, Transport } from "@/game/types";
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

// A traffic light on a pole, like the signals on the map. Path signals have
// a board behind the lights, and one-way ones a no-entry sign under them.
function SignalIcon({
  className,
  kind,
}: {
  className?: string;
  kind: SignalKind;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="11" y="14" width="2" height="9" fill="currentColor" />
      {kind !== "block" ? (
        <rect
          x="5.5"
          y="0.5"
          width="13"
          height="15"
          fill="#f4f4f5"
          stroke="currentColor"
        />
      ) : null}
      <rect x="8" y="2" width="8" height="12" rx="1" fill="#17181b" />
      <circle cx="12" cy="5.2" r="2.1" fill="#ff3b30" />
      <circle cx="12" cy="10.8" r="2.1" fill="#46f06f" />
      {kind === "oneway" ? (
        <>
          <circle cx="12" cy="19" r="4" fill="#d92d20" />
          <rect x="9.5" y="18.2" width="5" height="1.6" fill="#ffffff" />
        </>
      ) : null}
    </svg>
  );
}

type ToolButton = {
  id: Tool;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
};

const signalTool = (kind: SignalKind, id: Tool): ToolButton => ({
  id,
  label: SIGNALS[kind].label,
  detail: `${SIGNALS[kind].detail} · Click a piece of track, and again to turn the signal around · ${formatMoney(SIGNALS[kind].cost)}`,
  icon: ({ className }) => <SignalIcon className={className} kind={kind} />,
});

const depotTool = (
  kind: Transport,
  id: Tool,
  icon: LucideIcon
): ToolButton => ({
  id,
  label: TRANSPORT[kind].depotLabel,
  detail: `Where you buy ${VEHICLES[kind]} · ${formatMoney(TRANSPORT[kind].depotCost)}`,
  icon,
});

const VEHICLES: Record<Transport, string> = {
  road: "buses and trucks",
  rail: "trains",
  water: "ships",
};

// Everything there is to build, by the kind of transport it is for. Each
// kind has its own menu, which stays open until it is closed.
export const MENUS: {
  id: Transport;
  label: string;
  title: string;
  shortcut: string;
  icon: ComponentType<{ className?: string }>;
  tools: ToolButton[];
}[] = [
  {
    id: "rail",
    label: "Railways",
    title: "Build railways",
    shortcut: "2",
    icon: TrainTrack,
    tools: [
      {
        id: "rail",
        label: "Railway",
        detail: `Drag to lay track. Tracks only join where you drag one into another · ${formatMoney(TRACK.rail.cost)} per tile`,
        icon: TrainTrack,
      },
      {
        id: "rail-station",
        label: "Train station",
        detail: `Drag for a longer platform, or along an existing one to extend it · ${formatMoney(TRANSPORT.rail.stationCost)} per tile`,
        icon: Warehouse,
      },
      signalTool("block", "signal-block"),
      signalTool("path", "signal-path"),
      signalTool("oneway", "signal-oneway"),
      depotTool("rail", "rail-depot", TrainFront),
    ],
  },
  {
    id: "road",
    label: "Roads",
    title: "Build roads",
    shortcut: "3",
    icon: RoadIcon,
    tools: [
      {
        id: "road",
        label: "Road",
        detail: `${formatMoney(TRACK.road.cost)} per tile`,
        icon: RoadIcon,
      },
      {
        id: "road-station",
        label: "Road stop",
        detail: `For buses and trucks · ${formatMoney(TRANSPORT.road.stationCost)}`,
        icon: Signpost,
      },
      depotTool("road", "road-depot", BusFront),
    ],
  },
  {
    id: "water",
    label: "Waterways",
    title: "Build waterways",
    shortcut: "4",
    icon: Waves,
    tools: [
      {
        id: "canal",
        label: "Canal",
        detail: `Dig water for ships across land · ${formatMoney(TRACK.canal.cost)} per tile`,
        icon: Waves,
      },
      {
        id: "water-station",
        label: "Dock",
        detail: `For ships, on the water by the shore or on a canal · ${formatMoney(TRANSPORT.water.stationCost)}`,
        icon: Anchor,
      },
      depotTool("water", "water-depot", Ship),
    ],
  },
];

// Which menus are open
export type OpenMenus = { [menu in Transport]: boolean };

const SELECT: ToolButton & { shortcut: string } = {
  id: "select",
  label: "Select",
  detail: "Move around, inspect stations, depots, vehicles and towns",
  shortcut: "1",
  icon: MousePointer2,
};

const CLEAR: ToolButton & { shortcut: string } = {
  id: "bulldoze",
  label: "Clear",
  detail: `Remove your tracks, signals, canals, stations and depots · Clear town streets, ${formatMoney(STREET_REMOVAL_COST)} a tile, and buildings, from ${formatMoney(BUILDINGS[0].demolishCost)}`,
  shortcut: "5",
  icon: Trash2,
};

// The tools that have a key of their own
export const TOOL_SHORTCUTS = [SELECT, CLEAR];

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

function ToolButtons({
  tools,
  tool,
  onSelect,
}: {
  tools: (ToolButton & { shortcut?: string })[];
  tool: Tool;
  onSelect: (tool: Tool) => void;
}) {
  return tools.map(({ id, label, detail, shortcut, icon: Icon }) => (
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
      <TooltipContent side="bottom" sideOffset={6} className="max-w-72">
        <span className="font-bold">{label}</span>
        {shortcut ? ` (${shortcut})` : null}
        <div>{detail}</div>
      </TooltipContent>
    </Tooltip>
  ));
}

export function Toolbar({
  tool,
  menus,
  history,
  speed,
  xray,
  onSelect,
  onMenus,
  onSpeed,
  onXray,
}: {
  tool: Tool;
  menus: OpenMenus;
  history: History;
  speed: Speed;
  xray: boolean;
  onSelect: (tool: Tool) => void;
  onMenus: (menus: OpenMenus) => void;
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
    <>
      <Window title="Build">
        <div className="flex gap-px pt-[3px]">
          <ToolButtons tools={[SELECT]} tool={tool} onSelect={onSelect} />
          {MENUS.map(({ id, label, title, shortcut, icon: Icon, tools }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="win-button flex h-8 items-center gap-0.5 px-1.5"
                  aria-label={title}
                  aria-expanded={menus[id]}
                  aria-pressed={menus[id]}
                  onClick={() => onMenus({ ...menus, [id]: !menus[id] })}
                >
                  <Icon className="size-[18px]" />
                  <ChevronDown className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                <span className="font-bold">{label}</span> ({shortcut})
                <div>
                  {tools.map((each) => each.label).join(", ")}. Stays open until
                  you close it.
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          <ToolButtons tools={[CLEAR]} tool={tool} onSelect={onSelect} />
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
      {MENUS.filter(({ id }) => menus[id]).map(({ id, label, tools }) => (
        <Window
          key={id}
          title={label}
          canMinimize={false}
          onClose={() => onMenus({ ...menus, [id]: false })}
        >
          <div className="flex gap-px pt-[3px]">
            <ToolButtons tools={tools} tool={tool} onSelect={onSelect} />
          </div>
        </Window>
      ))}
    </>
  );
}
