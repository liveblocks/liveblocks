"use client";

import { useState } from "react";
import { Window } from "@/components/window";
import { MAP_SIZES } from "@/game/constants";

type Props = {
  // The size of the map being played right now
  size: number;
  onStart: (size: number) => void;
  onClose: () => void;
};

// Asks how big the next map should be before starting over on it
export function NewMapWindow({ size, onStart, onClose }: Props) {
  const [picked, setPicked] = useState(size);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-2">
      <Window
        title="New map"
        className="w-[22rem] max-w-full"
        canMinimize={false}
        onClose={onClose}
      >
        <p className="px-1 pt-2 pb-1.5">
          Starting over removes everything all players have built. How big
          should the new map be?
        </p>
        <ul className="win-inset flex flex-col">
          {MAP_SIZES.map((option) => (
            <li
              key={option.size}
              className="border-b border-[#dfdfdf] last:border-b-0"
            >
              <label
                className={`flex cursor-pointer items-center gap-2.5 px-2 py-1.5 ${
                  picked === option.size ? "bg-[#000080] text-white" : ""
                }`}
              >
                <input
                  type="radio"
                  name="map-size"
                  className="sr-only"
                  checked={picked === option.size}
                  onChange={() => setPicked(option.size)}
                />
                <span className="w-16 font-bold">{option.label}</span>
                <span className="flex-1">
                  {option.size} × {option.size} tiles · {option.detail}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-1 pt-[5px]">
          <button type="button" className="win-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="win-button font-bold"
            onClick={() => onStart(picked)}
          >
            Start new map
          </button>
        </div>
      </Window>
    </div>
  );
}
