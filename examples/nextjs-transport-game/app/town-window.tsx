"use client";

import { Window } from "@/components/window";
import { TOWN_MAX_STATIONS } from "@/game/constants";
import {
  townGrowthPerMinute,
  townPopulation,
  townServices,
} from "@/game/economy";
import type { StationData } from "@/game/types";
import type { World } from "@/game/world";
import { useNow } from "@/hooks/use-now";

type Props = {
  world: World;
  town: number;
  stations: ReadonlyMap<string, StationData>;
  startedAt: number;
  onClose: () => void;
};

// Opens when a town's name is clicked on the map
export function TownWindow({ world, town, stations, startedAt, onClose }: Props) {
  // The population isn't stored: it is worked out from the clock
  const now = useNow();
  const { name, houses } = world.towns[town];
  const builtAts = townServices(world, stations)[town];
  const population = townPopulation(world, town, builtAts, startedAt, now);
  const growth = townGrowthPerMinute(world, town, builtAts, startedAt, now);

  let service = "No station yet. Towns grow faster once they are served.";
  if (builtAts.length >= TOWN_MAX_STATIONS) {
    service = `Served by ${builtAts.length} stations. More won't speed it up.`;
  } else if (builtAts.length > 0) {
    service = `Served by ${builtAts.length} ${
      builtAts.length === 1 ? "station" : "stations"
    }. Each one makes it grow faster.`;
  }

  return (
    <Window title={name} className="w-64" onClose={onClose}>
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <dl className="win-inset grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-1.5 py-1">
          <dt>Population</dt>
          <dd className="text-right font-bold tabular-nums">
            {population.toLocaleString("en-US")}
          </dd>
          <dt>Growth</dt>
          <dd className="text-right tabular-nums">
            {growth > 0 ? `+${growth.toLocaleString("en-US")} per minute` : "None"}
          </dd>
          <dt>Houses</dt>
          <dd className="text-right tabular-nums">{houses}</dd>
        </dl>
        <p>{service}</p>
      </div>
    </Window>
  );
}
