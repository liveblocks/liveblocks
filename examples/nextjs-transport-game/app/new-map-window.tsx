"use client";

import { type ReactNode, useState } from "react";
import { Window } from "@/components/window";
import {
  type Climate,
  CLIMATE_KINDS,
  CLIMATES,
  type Landscape,
  LANDSCAPE_KINDS,
  LANDSCAPES,
  type MapOptions,
} from "@/game/climate";
import { MAP_SIZES } from "@/game/constants";
import { townsOn } from "@/game/world";

type Props = {
  // The map being played right now
  size: number;
  map: MapOptions;
  onStart: (size: number, map: MapOptions) => void;
  onClose: () => void;
};

// One of a few options to pick from, as a row of buttons of which one is
// pressed in
function Choice<Option extends string | number>({
  label,
  options,
  picked,
  onPick,
  children,
}: {
  label: string;
  options: readonly { id: Option; label: string }[];
  picked: Option;
  onPick: (option: Option) => void;
  // What the picked option means
  children: ReactNode;
}) {
  return (
    <fieldset className="pt-2">
      <legend className="float-left w-full px-1 pb-1 font-bold">{label}</legend>
      <div className="flex gap-px">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="win-button flex-1"
            aria-pressed={picked === option.id}
            onClick={() => onPick(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="px-1 pt-1 text-ui-muted">{children}</p>
    </fieldset>
  );
}

// Asks what the next map should be like before starting over on it
export function NewMapWindow({ size, map, onStart, onClose }: Props) {
  const [pickedSize, setPickedSize] = useState(size);
  const [climate, setClimate] = useState<Climate>(map.climate);
  const [landscape, setLandscape] = useState<Landscape>(map.landscape);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-2">
      <Window
        title="New map"
        className="w-[23rem] max-w-full"
        canMinimize={false}
        onClose={onClose}
      >
        <p className="px-1 pt-2">
          Starting over removes everything all players have built. What should
          the new map be like?
        </p>
        <Choice
          label="Size"
          options={MAP_SIZES.map((option) => ({
            id: option.size,
            label: option.label,
          }))}
          picked={pickedSize}
          onPick={setPickedSize}
        >
          {pickedSize} × {pickedSize} tiles, with about{" "}
          {townsOn(pickedSize, landscape)} towns
        </Choice>
        <Choice
          label="Land"
          options={LANDSCAPE_KINDS.map((id) => ({
            id,
            label: LANDSCAPES[id].label,
          }))}
          picked={landscape}
          onPick={setLandscape}
        >
          {LANDSCAPES[landscape].detail}
        </Choice>
        <Choice
          label="Climate"
          options={CLIMATE_KINDS.map((id) => ({
            id,
            label: CLIMATES[id].label,
          }))}
          picked={climate}
          onPick={setClimate}
        >
          {CLIMATES[climate].detail}
        </Choice>
        <div className="flex justify-end gap-1 pt-2.5">
          <button type="button" className="win-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="win-button font-bold"
            onClick={() => onStart(pickedSize, { climate, landscape })}
          >
            Start new map
          </button>
        </div>
      </Window>
    </div>
  );
}
