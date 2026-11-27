"use client";

import {
  NumberInput as UiNumberInput,
  NumberInputControl,
  NumberInputGroup,
} from "@ui-sdk/react/number-input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { INPUT_CLASS } from "./input";

type NumberInputProps = {
  label: string;
  value: number;
  // Called once the number is settled: on Enter, on leaving the field, and
  // for each press of an arrow key.
  onCommit: (value: number) => void;
  suffix?: string;
  step?: number;
  // How far Shift with an arrow key moves.
  largeStep?: number;
  min?: number;
  max?: number;
  // How many decimals the number is shown with, at most.
  decimals?: number;
};

/**
 * A number field that commits when you're done rather than on every
 * keystroke, so an edit is a single change, and a single undo step.
 *
 * ui-sdk's NumberInput parses what's typed, clamps it to `min` and `max`,
 * and steps it with the arrow keys. The number being typed is kept here
 * until it's committed; the field shows `value` the rest of the time, so it
 * follows changes made by other people.
 */
export function NumberInput({
  label,
  value,
  onCommit,
  suffix,
  step = 1,
  largeStep = step * 10,
  min,
  max,
  decimals = 0,
}: NumberInputProps) {
  // `undefined` while the field isn't being edited; `null` while it's empty.
  const [draft, setDraft] = useState<number | null | undefined>(undefined);

  return (
    <UiNumberInput
      value={draft === undefined ? value : draft}
      onValueChange={(next) => setDraft(next)}
      onValueCommit={(next) => {
        setDraft(undefined);
        if (next !== null && next !== value) {
          onCommit(next);
        }
      }}
      step={step}
      largeStep={largeStep}
      min={min}
      max={max}
      format={{ maximumFractionDigits: decimals, useGrouping: false }}
    >
      <NumberInputGroup className="relative flex">
        <NumberInputControl
          aria-label={label}
          className={cn(INPUT_CLASS, "font-mono text-xs", suffix && "pr-6")}
          onFocus={(event) => event.currentTarget.select()}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[10px] text-ink-faint">
            {suffix}
          </span>
        ) : null}
      </NumberInputGroup>
    </UiNumberInput>
  );
}
