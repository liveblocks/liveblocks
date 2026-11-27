"use client";

import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { Redo2Icon, RulerIcon, Undo2Icon } from "lucide-react";
import {
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { formatPlanSummary, type Unit } from "@/lib/units";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SegmentedControl, SegmentedControlItem } from "./ui/segmented-control";
import { Toggle } from "./ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipShortcut,
  TooltipTrigger,
} from "./ui/tooltip";

type HeaderProps = {
  name: string;
  onRename: (name: string) => void;
  roomCount: number;
  // Total floor area, in square centimeters.
  area: number;
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
  showDimensions: boolean;
  onShowDimensionsChange: (show: boolean) => void;
};

export function Header({
  name,
  onRename,
  roomCount,
  area,
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

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
      <div className="min-w-0 flex-1">
        <h1 className="sr-only">{name}</h1>
        <PlanName name={name} onRename={onRename} />
        <p className="truncate text-xs leading-tight text-ink-muted tabular-nums">
          {formatPlanSummary(roomCount, area, unit)}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton
          label="Undo"
          shortcut="mod+z"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2Icon />
        </IconButton>
        <IconButton
          label="Redo"
          shortcut="mod+shift+z"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2Icon />
        </IconButton>
      </div>

      <span className="h-4 w-px bg-line" />

      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              aria-label="Dimensions"
              pressed={showDimensions}
              onPressedChange={(pressed) => onShowDimensionsChange(pressed)}
              className="size-7 rounded-md text-ink-secondary hover:bg-hover hover:text-ink data-pressed:bg-brand-soft data-pressed:text-brand [&_svg]:size-4"
            />
          }
        >
          <RulerIcon />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {showDimensions ? "Hide dimensions" : "Show all dimensions"}
        </TooltipContent>
      </Tooltip>

      {/* Units are a personal preference: the plan itself is in centimeters. */}
      <SegmentedControl
        aria-label="Units"
        value={unit}
        onValueChange={(value) =>
          onUnitChange(value === "imperial" ? "imperial" : "metric")
        }
        className="hidden md:flex"
      >
        <SegmentedControlItem value="metric" aria-label="Meters">
          m
        </SegmentedControlItem>
        <SegmentedControlItem value="imperial" aria-label="Feet and inches">
          ft
        </SegmentedControlItem>
      </SegmentedControl>

      <span className="h-4 w-px bg-line" />

      {/* Everyone on this plan right now, from Presence. */}
      <AvatarStack size={26} max={4} />
    </header>
  );
}

/**
 * The plan's name: click it to rename the plan for everyone.
 *
 * It's a text field all along rather than a label swapped for a field, so
 * the text is drawn by the same element whether or not it's being edited
 * and doesn't move by a pixel when editing starts or ends. Only the
 * background and the ring change with hover and focus.
 */
function PlanName({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const text = draft ?? name;

  // Leaving the field ends the edit. The name is written once, then, rather
  // than on every keystroke.
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.scrollLeft = 0;
    const next = cancelled.current ? "" : (draft ?? "").trim();
    cancelled.current = false;
    setDraft(null);
    // An empty name keeps the old one.
    if (next && next !== name) {
      onRename(next);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      cancelled.current = true;
      event.currentTarget.blur();
    }
  };

  return (
    <div className="flex">
      {/* The field is as wide as its text: an invisible copy of the text
          sizes the cell they share. The copy is a few pixels wider, to leave
          room for the caret after the last letter. */}
      <span className="-mx-1 inline-grid max-w-[calc(100%_+_0.5rem)] min-w-0 text-[13px] leading-5 font-semibold text-ink">
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1 min-w-8 overflow-hidden pr-2 pl-1 whitespace-pre"
        >
          {text}
        </span>
        <Input
          type="text"
          aria-label="Plan name"
          title="Rename plan"
          autoComplete="off"
          spellCheck={false}
          maxLength={60}
          className="col-start-1 row-start-1 h-5 w-full min-w-0 rounded px-1 text-ellipsis transition-colors outline-none hover:bg-hover focus:bg-surface focus:ring-1 focus:ring-brand"
          value={text}
          onValueChange={(value) => setDraft(value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </span>
    </div>
  );
}

function IconButton({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string;
  // The keys that do the same, like "mod+z". They're bound in the canvas.
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip shortcut={shortcut}>
      <TooltipTrigger
        render={
          // Still focusable when there's nothing to undo, so the tooltip
          // can say what the button is for.
          <Button
            aria-label={label}
            disabled={disabled}
            focusableWhenDisabled
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        <TooltipShortcut />
      </TooltipContent>
    </Tooltip>
  );
}
