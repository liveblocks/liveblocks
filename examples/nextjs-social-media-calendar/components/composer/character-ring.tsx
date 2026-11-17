"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SIZE = 20;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Like X: the count only appears once the limit is close.
const WARN_WITHIN = 20;

/**
 * The caption's length against the strictest network's limit, as a ring that
 * fills as you type, the way X shows it: gray while there's room, the
 * characters left shown next to it as the limit nears, red once it's over.
 */
export function CharacterRing({
  length,
  max,
  label,
}: {
  length: number;
  /** The limit of the strictest network. */
  max: number;
  /** The network the limit comes from, named only when it isn't obvious. */
  label?: string;
}) {
  const remaining = max - length;
  const over = remaining < 0;
  const near = !over && remaining <= WARN_WITHIN;
  const progress = Math.min(length / max, 1);
  const description = `${length.toLocaleString()} / ${max.toLocaleString()}${
    label ? ` on ${label}` : ""
  }`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="flex h-7 items-center gap-1.5 text-xs tabular-nums"
            role="status"
            aria-live="polite"
            aria-label={description}
          />
        }
      >
        {over || near ? (
          <span
            className={cn(
              over ? "font-medium text-red-600" : "text-neutral-500"
            )}
          >
            {remaining.toLocaleString()}
          </span>
        ) : null}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-neutral-200"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className={cn(
              "transition-[stroke-dashoffset] duration-150",
              over
                ? "stroke-red-600"
                : near
                  ? "stroke-amber-500"
                  : "stroke-neutral-500"
            )}
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}
