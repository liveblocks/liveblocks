"use client";

import { Window } from "@/components/window";
import { CARGO, TRANSPORT } from "@/game/constants";
import { getStationInfo, industryState, waitingAt } from "@/game/economy";
import type {
  CompanyData,
  IndustryState,
  StationData,
  Vehicle,
} from "@/game/types";
import { INDUSTRY, type World } from "@/game/world";
import { useNow } from "@/hooks/use-now";

type Props = {
  world: World;
  tile: number;
  station: StationData;
  owner: CompanyData | undefined;
  vehicles: ReadonlyMap<string, Vehicle>;
  industries: ReadonlyMap<string, IndustryState>;
  // When the map started, on the game clock
  startedAt: number;
  mine: boolean;
  onStartRoute: () => void;
  onClose: () => void;
};

export function StationWindow({
  world,
  tile,
  station,
  owner,
  vehicles,
  industries,
  startedAt,
  mine,
  onStartRoute,
  onClose,
}: Props) {
  // Waiting cargo isn't stored as a number that ticks up: it is computed
  // from when a vehicle last loaded some
  const now = useNow();

  const info = getStationInfo(world, tile);
  const waiting = waitingAt(
    world,
    tile,
    station,
    (industry) => industryState(industries.get(String(industry.id)), startedAt),
    now
  );
  const serving = [...vehicles.values()].filter((vehicle) =>
    vehicle.stops.includes(String(tile))
  ).length;

  return (
    <Window title={station.name} className="w-64" onClose={onClose}>
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <p className="flex items-center gap-1.5">
          <span
            className="size-3 shrink-0 border border-black"
            style={{ background: owner?.color ?? "#a3a3a3" }}
          />
          <span className="truncate">
            {owner?.name ?? "Unknown"} · {TRANSPORT[station.kind].stationLabel}
          </span>
        </p>

        <div>
          <h3 className="mb-0.5 font-bold">Waiting here</h3>
          <ul className="win-inset flex flex-col gap-1 px-1.5 py-1">
            {info.supply.length === 0 ? (
              <li className="text-[#808080]">Nothing is produced nearby</li>
            ) : null}
            {waiting.map(({ cargo, amount, cap, rate }) => {
              const makers = info.industries
                .filter(
                  (industry) => INDUSTRY[industry.type].produces === cargo
                )
                .map((industry) => industry.name);
              return (
                <li key={cargo}>
                  <div className="flex justify-between">
                    <span>{CARGO[cargo].label}</span>
                    <span className="tabular-nums">
                      {Math.floor(amount).toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="h-2 border border-[#808080] bg-white">
                    <div
                      className="h-full bg-[#000080]"
                      style={{ width: `${Math.min(1, amount / cap) * 100}%` }}
                    />
                  </div>
                  <p className="text-[#606060]">
                    {cargo === "passengers"
                      ? `About ${Math.round(rate * 60)} a minute, from the ${info.population.toLocaleString("en-US")} people in reach`
                      : `About ${Math.round(rate * 60)} a minute, at ${makers.join(" and ")}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <p>
          <span className="font-bold">Accepts:</span>{" "}
          {info.accepts.length
            ? info.accepts.map((cargo) => CARGO[cargo].label).join(", ")
            : "nothing"}
        </p>

        <p>
          {serving === 0
            ? "No vehicle stops here yet"
            : `${serving} ${serving === 1 ? "vehicle stops" : "vehicles stop"} here`}
        </p>

        {mine ? (
          <button
            type="button"
            className="win-button self-end"
            onClick={onStartRoute}
          >
            New vehicle from here
          </button>
        ) : null}
      </div>
    </Window>
  );
}
