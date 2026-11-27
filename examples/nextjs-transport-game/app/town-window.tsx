"use client";

import { Window } from "@/components/window";
import { BUILDINGS, TOWN_MAX_STATIONS } from "@/game/constants";
import { townGrowthRate, townStats } from "@/game/towns";
import type { World } from "@/game/world";

type Props = {
  world: World;
  town: number;
  // How many stations are close enough to make the town grow faster
  stations: number;
  // Whether the town has nothing left to build
  grown: boolean;
  onClose: () => void;
};

// Opens when a town's name is clicked on the map
export function TownWindow({ world, town, stations, grown, onClose }: Props) {
  const { name } = world.towns[town];
  const { population, buildings, tallest } = townStats(world)[town];
  const seconds = Math.round(60 / townGrowthRate(stations));

  let service = "No station nearby yet. Towns grow faster with stations.";
  if (stations >= TOWN_MAX_STATIONS) {
    service = `${stations} stations nearby. More won't speed it up.`;
  } else if (stations > 0) {
    service = `${stations} ${
      stations === 1 ? "station" : "stations"
    } nearby. Each one makes it grow faster.`;
  }

  return (
    <Window title={name} className="w-64" onClose={onClose}>
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <dl className="win-inset grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-1.5 py-1">
          <dt>Population</dt>
          <dd className="text-right font-bold tabular-nums">
            {population.toLocaleString("en-US")}
          </dd>
          <dt>Buildings</dt>
          <dd className="text-right tabular-nums">{buildings}</dd>
          <dt>Tallest</dt>
          <dd className="text-right">{BUILDINGS[tallest].label}</dd>
          <dt>Growth</dt>
          <dd className="text-right tabular-nums">
            {grown ? "Fully grown" : `Something new every ${seconds}s`}
          </dd>
        </dl>
        <p>{grown ? "This town has no room left to grow." : service}</p>
      </div>
    </Window>
  );
}
