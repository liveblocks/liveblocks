"use client";

import { shallow } from "@liveblocks/react";
import { useOthers, useSelf } from "@liveblocks/react/suspense";
import {
  Bus,
  Copy,
  RotateCcw,
  TrainFront,
  Trash2,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CARGO, MAX_VEHICLES_PER_COMPANY, TRACK } from "@/game/constants";
import { cargoBetween, companyBalance, formatMoney } from "@/game/economy";
import type { CompanyData, StationData, Vehicle } from "@/game/types";
import type { World } from "@/game/world";

type Props = {
  world: World;
  myId: string;
  stations: ReadonlyMap<string, StationData>;
  vehicles: ReadonlyMap<string, Vehicle>;
  companies: ReadonlyMap<string, CompanyData>;
  onHighlight: (vehicleId: string | null) => void;
  onClone: (vehicleId: string) => void;
  onSell: (vehicleId: string) => void;
  onReset: () => void;
};

export function SidePanel({
  world,
  myId,
  stations,
  vehicles,
  companies,
  onHighlight,
  onClone,
  onSell,
  onReset,
}: Props) {
  // Who is playing right now, to show which companies are being run live
  const othersIds = useOthers((others) => others.map((other) => other.id), shallow);
  const selfId = useSelf((me) => me.id);
  const online = new Set([selfId, ...othersIds]);

  const ranking = [...companies]
    .map(([id, company]) => ({
      id,
      company,
      balance: companyBalance(company, vehicles.values(), id),
      vehicles: [...vehicles.values()].filter((each) => each.owner === id)
        .length,
    }))
    .sort((a, b) => b.balance - a.balance);

  const mine = [...vehicles].filter(([, vehicle]) => vehicle.owner === myId);

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col gap-2 lg:flex">
      <section className="rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <div className="flex items-center justify-between border-b border-neutral-100 py-1.5 pr-1.5 pl-3">
          <h2 className="text-sm font-medium text-neutral-900">Companies</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="New map"
                onClick={onReset}
              >
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Start over on a new map</TooltipContent>
          </Tooltip>
        </div>
        <ol className="flex flex-col gap-0.5 p-1.5">
          {ranking.map((entry, index) => (
            <li
              key={entry.id}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
                entry.id === myId ? "bg-neutral-100" : ""
              }`}
            >
              <span className="w-3 text-xs text-neutral-400 tabular-nums">
                {index + 1}
              </span>
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ background: entry.company.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-neutral-900">
                    {entry.company.name}
                  </span>
                  {online.has(entry.id) ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-emerald-500"
                      title="Online"
                    />
                  ) : null}
                </span>
                <span className="block text-xs text-neutral-500">
                  {entry.vehicles} {entry.vehicles === 1 ? "vehicle" : "vehicles"}
                </span>
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  entry.balance < 0 ? "text-red-600" : "text-neutral-700"
                }`}
              >
                {formatMoney(entry.balance)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2.5">
          <h2 className="text-sm font-medium text-neutral-900">Your vehicles</h2>
          <span className="text-xs text-neutral-400 tabular-nums">
            {mine.length}/{MAX_VEHICLES_PER_COMPANY}
          </span>
        </div>

        {mine.length === 0 ? (
          <ol className="flex list-decimal flex-col gap-2 py-4 pr-4 pl-8 text-sm text-neutral-500">
            <li>Place two stations: one next to a town or an industry, one where its passengers or cargo should go.</li>
            <li>Connect them with a road or a railway.</li>
            <li>Pick the vehicle tool and click both stations.</li>
          </ol>
        ) : (
          <ul
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5"
            onMouseLeave={() => onHighlight(null)}
          >
            {mine.map(([id, vehicle]) => (
              <VehicleRow
                key={id}
                world={world}
                vehicle={vehicle}
                stations={stations}
                onHighlight={() => onHighlight(id)}
                onClone={() => onClone(id)}
                onSell={() => onSell(id)}
              />
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function VehicleRow({
  world,
  vehicle,
  stations,
  onHighlight,
  onClone,
  onSell,
}: {
  world: World;
  vehicle: Vehicle;
  stations: ReadonlyMap<string, StationData>;
  onHighlight: () => void;
  onClone: () => void;
  onSell: () => void;
}) {
  const [from, to] = vehicle.stops;
  const passengers =
    cargoBetween(world, Number(from), Number(to)).includes("passengers") ||
    cargoBetween(world, Number(to), Number(from)).includes("passengers");
  const Icon = vehicle.kind === "rail" ? TrainFront : passengers ? Bus : Truck;
  // Without a path, `departAt` is when the vehicle next looks for a route
  const stalled = vehicle.path.length < 2 && vehicle.departAt > Date.now();

  let status = "Heading out empty";
  if (stalled) {
    status = "Can't find a way to its next station";
  } else if (vehicle.cargo) {
    status = `Carrying ${vehicle.load} ${CARGO[vehicle.cargo].label.toLowerCase()}`;
  } else if (vehicle.trips === 0) {
    status = "Getting ready";
  }

  return (
    <li
      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-neutral-100"
      onMouseEnter={onHighlight}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 group-hover:bg-white">
        {stalled ? (
          <TriangleAlert className="size-4 text-red-600" />
        ) : (
          <Icon className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-neutral-900">
          {stations.get(from)?.name ?? "?"} → {stations.get(to)?.name ?? "?"}
        </span>
        <span className="block truncate text-xs text-neutral-500">
          {status}
        </span>
      </span>
      <span
        className={`font-mono text-xs tabular-nums group-hover:hidden ${
          vehicle.earned < 0 ? "text-red-600" : "text-emerald-700"
        }`}
      >
        {vehicle.earned > 0 ? "+" : ""}
        {formatMoney(vehicle.earned)}
      </span>
      <span className="hidden shrink-0 group-hover:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Buy another one"
              onClick={onClone}
            >
              <Copy />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Buy another one · {formatMoney(TRACK[vehicle.kind].vehicleCost)}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Sell"
              onClick={onSell}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Sell · {formatMoney(TRACK[vehicle.kind].vehicleCost / 2)} back
          </TooltipContent>
        </Tooltip>
      </span>
    </li>
  );
}
