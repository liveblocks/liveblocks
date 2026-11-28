"use client";

import { Window } from "@/components/window";
import { CARGO, TRANSPORT } from "@/game/constants";
import { getStationInfo, industryState, waitingAt } from "@/game/economy";
import { type Network, SIDES } from "@/game/network";
import {
  carriagesAt,
  platformLength,
  type Station,
  type Stations,
} from "@/game/stations";
import type { CompanyData, IndustryState, Vehicle } from "@/game/types";
import { INDUSTRY, type World } from "@/game/world";
import { useNow } from "@/hooks/use-now";

type Props = {
  world: World;
  network: Network;
  // All the tiles of the station count as one
  station: Station;
  stations: Stations;
  owner: CompanyData | undefined;
  vehicles: ReadonlyMap<string, Vehicle>;
  industries: ReadonlyMap<string, IndustryState>;
  // When the map started, on the game clock
  startedAt: number;
  onClose: () => void;
};

export function StationWindow({
  world,
  network,
  station,
  stations,
  owner,
  vehicles,
  industries,
  startedAt,
  onClose,
}: Props) {
  // Waiting cargo isn't stored as a number that ticks up: it is computed
  // from when a vehicle last loaded some
  const now = useNow();

  const info = getStationInfo(world, station.tiles);
  const waiting = waitingAt(
    world,
    station.tiles,
    station,
    (industry) => industryState(industries.get(String(industry.id)), startedAt),
    now
  );
  const serving = [...vehicles.values()].filter(
    (vehicle) =>
      vehicle.status !== "wreck" &&
      vehicle.stops.some((stop) => stations.at(stop)?.id === station.id)
  ).length;
  // A station can have several platforms side by side
  const length = Math.max(
    ...station.tiles.flatMap((tile) =>
      SIDES.map((side) => platformLength(network, station, tile, side))
    )
  );

  return (
    <Window title={station.name} className="w-64" onClose={onClose}>
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <p className="flex items-center gap-1.5">
          <span
            className="size-3 shrink-0 border border-ui-edge"
            style={{ background: owner?.color ?? "#a3a3a3" }}
          />
          <span className="truncate">
            {owner?.name ?? "Unknown"} · {TRANSPORT[station.kind].stationLabel}
          </span>
        </p>
        {station.kind === "rail" ? (
          <p className="text-ui-muted">
            Its {station.tiles.length > length ? "longest " : ""}platform is{" "}
            {length} {length === 1 ? "tile" : "tiles"} long: enough for{" "}
            {carriagesAt(length)} carriages to load and unload. Drag the station
            tool along it to make it longer.
          </p>
        ) : null}

        <div>
          <h3 className="mb-0.5 font-bold">Waiting here</h3>
          <ul className="win-inset flex flex-col gap-1 px-1.5 py-1">
            {info.supply.length === 0 ? (
              <li className="text-ui-faint">Nothing is produced nearby</li>
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
                  <div className="h-2 border border-ui-line bg-ui-field">
                    <div
                      className="h-full bg-ui-accent"
                      style={{ width: `${Math.min(1, amount / cap) * 100}%` }}
                    />
                  </div>
                  <p className="text-ui-muted">
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
      </div>
    </Window>
  );
}
