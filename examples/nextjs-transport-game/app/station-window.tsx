"use client";

import { Window } from "@/components/window";
import { CARGO, STOCK_CAP, TRANSPORT } from "@/game/constants";
import { getStationInfo, stockAt } from "@/game/economy";
import type { CompanyData, StationData, Vehicle } from "@/game/types";
import type { World } from "@/game/world";
import { useNow } from "@/hooks/use-now";

type Props = {
  world: World;
  tile: number;
  station: StationData;
  owner: CompanyData | undefined;
  vehicles: ReadonlyMap<string, Vehicle>;
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
  mine,
  onStartRoute,
  onClose,
}: Props) {
  // Waiting cargo isn't stored as a number that ticks up: it is computed
  // from when a vehicle last loaded some
  const now = useNow();

  const info = getStationInfo(world, tile);
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
            {info.supply.map(({ cargo, rate }) => {
              const amount = Math.floor(stockAt(station, cargo, rate, now));
              return (
                <li key={cargo}>
                  <div className="flex justify-between">
                    <span>{CARGO[cargo].label}</span>
                    <span className="tabular-nums">{amount}</span>
                  </div>
                  <div className="h-2 border border-[#808080] bg-white">
                    <div
                      className="h-full bg-[#000080]"
                      style={{ width: `${(amount / STOCK_CAP) * 100}%` }}
                    />
                  </div>
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
