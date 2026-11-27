"use client";

import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { Redo2Icon, RulerIcon, Undo2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { polygonArea } from "@/lib/geometry";
import type { Room } from "@/lib/plan";
import type { Plan } from "@/lib/templates";
import { formatArea, type Unit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type HeaderProps = {
  plan: Plan;
  rooms: ReadonlyMap<string, Room>;
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
  showDimensions: boolean;
  onShowDimensionsChange: (show: boolean) => void;
};

export function Header({
  plan,
  rooms,
  unit,
  onUnitChange,
  showDimensions,
  onShowDimensionsChange,
}: HeaderProps) {
  // Each person undoes and redoes only their own changes.
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  let area = 0;
  for (const room of rooms.values()) {
    area += polygonArea(room.points);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[13px] leading-tight font-semibold text-ink">
          {plan.name}
        </h1>
        <p className="truncate text-xs leading-tight text-ink-muted tabular-nums">
          {rooms.size === 0
            ? "No rooms yet"
            : `${rooms.size} ${rooms.size === 1 ? "room" : "rooms"} · ${formatArea(area, unit)}`}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton
          label="Undo"
          shortcut="⌘Z"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2Icon />
        </IconButton>
        <IconButton
          label="Redo"
          shortcut="⇧⌘Z"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2Icon />
        </IconButton>
      </div>

      <span className="h-4 w-px bg-line" />

      <IconButton
        label={showDimensions ? "Hide dimensions" : "Show all dimensions"}
        pressed={showDimensions}
        onClick={() => onShowDimensionsChange(!showDimensions)}
      >
        <RulerIcon />
      </IconButton>

      {/* Units are a personal preference: the plan itself is in centimeters. */}
      <div
        role="radiogroup"
        aria-label="Units"
        className="hidden h-7 items-center rounded-md bg-hover p-0.5 md:flex"
      >
        {(
          [
            ["metric", "m"],
            ["imperial", "ft"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={unit === value}
            aria-label={value === "metric" ? "Meters" : "Feet and inches"}
            onClick={() => onUnitChange(value)}
            className={cn(
              "h-6 min-w-7 rounded px-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              unit === value
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <span className="h-4 w-px bg-line" />

      {/* Everyone on this plan right now, from Presence. */}
      <AvatarStack size={26} max={4} />
    </header>
  );
}

function IconButton({
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4",
            pressed
              ? "bg-brand-soft text-brand"
              : "text-ink-secondary hover:bg-hover hover:text-ink"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
        {shortcut ? (
          <kbd className="ml-2 font-sans text-background/60">{shortcut}</kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
