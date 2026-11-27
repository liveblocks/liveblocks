"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CARGO, STOCK_CAP } from "@/game/constants";
import { getStationInfo, stockAt } from "@/game/economy";
import type { CompanyData, StationData, Vehicle } from "@/game/types";
import type { World } from "@/game/world";

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

export function StationCard({
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
  // from when a vehicle last loaded some. Refresh the display every second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const info = getStationInfo(world, tile);
  const serving = [...vehicles.values()].filter((vehicle) =>
    vehicle.stops.includes(String(tile))
  ).length;

  return (
    <div className="absolute top-3 right-3 w-64 rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
      <div className="flex items-start justify-between gap-2 border-b border-neutral-100 py-2 pr-1.5 pl-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-neutral-900">
            {station.name}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span
              className="size-2 rounded-sm"
              style={{ background: owner?.color ?? "#a3a3a3" }}
            />
            {owner?.name ?? "Unknown"} ·{" "}
            {station.kind === "road" ? "Road stop" : "Train station"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Close"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className="flex flex-col gap-3 p-3 text-sm">
        <div>
          <h3 className="mb-1.5 text-xs font-medium text-neutral-500">
            Waiting here
          </h3>
          {info.supply.length === 0 ? (
            <p className="text-neutral-400">Nothing is produced nearby</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {info.supply.map(({ cargo, rate }) => {
                const amount = Math.floor(stockAt(station, cargo, rate, now));
                return (
                  <li key={cargo}>
                    <div className="flex justify-between">
                      <span className="text-neutral-700">
                        {CARGO[cargo].label}
                      </span>
                      <span className="font-mono text-xs text-neutral-900 tabular-nums">
                        {amount}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-neutral-800"
                        style={{ width: `${(amount / STOCK_CAP) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-1 text-xs font-medium text-neutral-500">Accepts</h3>
          <p className={info.accepts.length ? "text-neutral-700" : "text-neutral-400"}>
            {info.accepts.length
              ? info.accepts.map((cargo) => CARGO[cargo].label).join(", ")
              : "Nothing"}
          </p>
        </div>

        <p className="text-xs text-neutral-500">
          {serving === 0
            ? "No vehicle stops here yet"
            : `${serving} ${serving === 1 ? "vehicle stops" : "vehicles stop"} here`}
        </p>

        {mine ? (
          <Button size="sm" onClick={onStartRoute}>
            New vehicle from here
          </Button>
        ) : null}
      </div>
    </div>
  );
}
