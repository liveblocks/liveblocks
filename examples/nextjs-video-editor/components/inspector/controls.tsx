"use client";

import { useHistory } from "@liveblocks/react/suspense";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function Section({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-neutral-950/6 px-4 py-4 first:border-t-0">
      <div className="flex h-4 items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-900">{title}</h3>
        {onReset ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Reset ${title.toLowerCase()}`}
                onClick={onReset}
                className="-mr-1 flex size-6 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-950/5 hover:text-neutral-700"
              >
                <RotateCcwIcon className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * A labelled slider bound to a Storage field. Each drag is a single undo
 * step: history is paused while the pointer is down.
 */
export function PropertySlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const history = useHistory();

  return (
    <div className="grid grid-cols-[72px_1fr_44px] items-center gap-3">
      <span className="text-xs text-neutral-500">{label}</span>
      <Slider
        aria-label={label}
        value={[Math.min(max, Math.max(min, value))]}
        min={min}
        max={max}
        step={step}
        onPointerDown={() => {
          history.pause();
          const end = () => {
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            history.resume();
          };
          window.addEventListener("pointerup", end);
          window.addEventListener("pointercancel", end);
        }}
        onValueChange={([next]) => onChange(next)}
      />
      <span className="text-right text-xs text-neutral-700 tabular">
        {format(value)}
      </span>
    </div>
  );
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function seconds(value: number) {
  return `${value.toFixed(1)}s`;
}

export function Options<T extends string>({
  label,
  value,
  options,
  onChange,
  renderOption,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  renderOption?: (option: { id: T; label: string }) => ReactNode;
}) {
  return (
    <SegmentedControl aria-label={label} value={value} onValueChange={onChange}>
      {options.map((option) => (
        <SegmentedControlItem key={option.id} value={option.id}>
          {renderOption ? renderOption(option) : option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

export function Swatches({
  label,
  value,
  colors,
  onChange,
}: {
  label: string;
  value: string;
  colors: string[];
  onChange: (color: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        const light = isLight(color);
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              "flex size-7 cursor-pointer items-center justify-center rounded-full ring-1 ring-neutral-950/10 transition-[outline-color] ring-inset outline-2 outline-offset-2 outline-transparent focus-visible:outline-ring",
              selected && "outline-brand focus-visible:outline-brand"
            )}
            style={{ background: color }}
          >
            {selected ? (
              <CheckIcon
                className={cn(
                  "size-3.5",
                  light ? "text-neutral-900" : "text-white"
                )}
                strokeWidth={3}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function isLight(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}
