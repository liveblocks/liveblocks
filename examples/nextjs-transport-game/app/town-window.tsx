"use client";

import { Window } from "@/components/window";
import { BUILDING_TIERS, BUILDINGS, TOWN_MAX_STATIONS } from "@/game/constants";
import { townGrowthPace, townGrowthRate, townStats } from "@/game/towns";
import type { World } from "@/game/world";

type Props = {
  world: World;
  town: number;
  // How many of the town's stations vehicles call at, which makes it grow
  stations: number;
  // How far the town is to its full size, from 0 to 1
  progress: number;
  onClose: () => void;
};

function pluralize(label: string) {
  return label.endsWith("ch") ? `${label}es` : `${label}s`;
}

// Opens when a town's name is clicked on the map
export function TownWindow({
  world,
  town,
  stations,
  progress,
  onClose,
}: Props) {
  const grown = progress >= 0.995;
  const { name } = world.towns[town];
  const { population, buildings, tallest, counts } = townStats(world)[town];
  // What the town has besides houses and offices, e.g. "Church, 2 shops"
  const places = BUILDINGS.map(({ label }, variant) => ({
    label: label.toLowerCase(),
    count: counts[variant],
  }))
    .slice(BUILDING_TIERS)
    .filter((place) => place.count > 0)
    .map(({ label, count }) => {
      if (count === 1) {
        return label;
      }
      return `${count} ${label.endsWith("s") ? label : pluralize(label)}`;
    })
    .join(", ");
  const perMinute = townGrowthRate(stations) * townGrowthPace(progress);

  let growth = "Not growing";
  if (grown) {
    growth = "Fully grown";
  } else if (perMinute >= 1) {
    growth = `Something new every ${Math.round(60 / perMinute)}s`;
  } else if (perMinute > 0) {
    growth = `Something new every ${Math.round(1 / perMinute)} min`;
  }

  let service =
    "Nothing is transported here yet. Towns only grow when vehicles call at a station in them.";
  if (stations >= TOWN_MAX_STATIONS) {
    service = `Vehicles call at ${stations} stations here. Only the first ${TOWN_MAX_STATIONS} count, so more won't speed it up.`;
  } else if (stations > 0) {
    service = `Vehicles call at ${stations} ${
      stations === 1 ? "station" : "stations"
    } here. Each one makes it grow faster.`;
  }
  if (stations > 0 && progress > 0.6) {
    service += " Big towns grow slowly.";
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
          {places ? (
            <>
              <dt>Also has</dt>
              <dd className="text-right first-letter:uppercase">{places}</dd>
            </>
          ) : null}
          <dt>Growth</dt>
          <dd className="text-right tabular-nums">{growth}</dd>
        </dl>
        <p>{grown ? "This town has no room left to grow." : service}</p>
      </div>
    </Window>
  );
}
