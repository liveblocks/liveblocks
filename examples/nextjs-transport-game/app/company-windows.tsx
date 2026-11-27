"use client";

import {
  Bus,
  Copy,
  Ship,
  TrainFront,
  Trash2,
  TriangleAlert,
  Truck,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Window } from "@/components/window";
import { CARGO, MAX_VEHICLES_PER_COMPANY, TRANSPORT } from "@/game/constants";
import {
  cargoBetween,
  companyBalance,
  formatMoney,
  loadOf,
} from "@/game/economy";
import type { CompanyData, StationData, Vehicle } from "@/game/types";
import type { World } from "@/game/world";

// The league table: every company that has been started, richest first
export function CompaniesWindow({
  myCompany,
  vehicles,
  companies,
  managers,
  onReset,
  onClose,
}: {
  myCompany: string | null;
  vehicles: ReadonlyMap<string, Vehicle>;
  companies: ReadonlyMap<string, CompanyData>;
  // Company id → name of the player running it right now
  managers: ReadonlyMap<string, string>;
  onReset: () => void;
  onClose: () => void;
}) {
  const ranking = [...companies]
    .map(([id, company]) => ({
      id,
      company,
      balance: companyBalance(company, vehicles.values(), id),
      vehicles: [...vehicles.values()].filter((each) => each.owner === id)
        .length,
    }))
    .sort((a, b) => b.balance - a.balance);

  return (
    <Window title="Companies" className="w-72" onClose={onClose}>
      <ol className="win-inset mt-[3px] flex flex-col">
        {ranking.length === 0 ? (
          <li className="px-1.5 py-1 text-[#808080]">No company started yet</li>
        ) : null}
        {ranking.map((entry, index) => (
          <li
            key={entry.id}
            className={`flex items-center gap-2 px-1.5 py-1 ${
              entry.id === myCompany ? "bg-[#000080] text-white" : ""
            }`}
          >
            <span className="w-3 tabular-nums">{index + 1}</span>
            <span
              className="size-3 shrink-0 border border-black"
              style={{ background: entry.company.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">
                {entry.company.name}
              </span>
              <span className="block truncate opacity-75">
                {managers.get(entry.id) ?? "Nobody at the wheel"} ·{" "}
                {entry.vehicles} {entry.vehicles === 1 ? "vehicle" : "vehicles"}
              </span>
            </span>
            <span
              className={`tabular-nums ${
                entry.balance < 0 && entry.id !== myCompany ? "text-[#c00000]" : ""
              }`}
            >
              {formatMoney(entry.balance)}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex justify-end pt-[3px]">
        <button type="button" className="win-button" onClick={onReset}>
          New map…
        </button>
      </div>
    </Window>
  );
}

export function VehiclesWindow({
  world,
  myCompany,
  stations,
  vehicles,
  onHighlight,
  onClone,
  onSell,
  onClose,
}: {
  world: World;
  myCompany: string;
  stations: ReadonlyMap<string, StationData>;
  vehicles: ReadonlyMap<string, Vehicle>;
  onHighlight: (vehicleId: string | null) => void;
  onClone: (vehicleId: string) => void;
  onSell: (vehicleId: string) => void;
  onClose: () => void;
}) {
  const mine = [...vehicles].filter(([, vehicle]) => vehicle.owner === myCompany);

  return (
    <Window
      title={`Vehicles (${mine.length}/${MAX_VEHICLES_PER_COMPANY})`}
      className="w-72"
      onClose={onClose}
    >
      {mine.length === 0 ? (
        <ol className="win-inset mt-[3px] flex list-decimal flex-col gap-1 py-1.5 pr-2 pl-6">
          <li>
            Place two stations: one next to a town or an industry, one where its
            passengers or cargo should go.
          </li>
          <li>
            Connect them with a road or a railway. Docks only need open water
            between them.
          </li>
          <li>Pick the vehicle tool and click both stations.</li>
        </ol>
      ) : (
        <ul
          className="win-inset mt-[3px] flex max-h-[38vh] flex-col overflow-y-auto"
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
    </Window>
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
  let Icon = passengers ? Bus : Truck;
  if (vehicle.kind === "rail") {
    Icon = TrainFront;
  } else if (vehicle.kind === "water") {
    Icon = Ship;
  }
  // Without a path, `departAt` is when the vehicle next looks for a route
  const stalled = vehicle.path.length < 2 && vehicle.departAt > Date.now();
  const onBoard = loadOf(vehicle);

  let status = "Heading out empty";
  if (stalled) {
    status = "Can't find a way to its next station";
  } else if (onBoard.length > 0) {
    status = `Carrying ${onBoard
      .map(({ cargo, amount }) => `${amount} ${CARGO[cargo].label.toLowerCase()}`)
      .join(" and ")}`;
  } else if (vehicle.trips === 0) {
    status = "Getting ready";
  }

  return (
    <li
      className="group flex items-center gap-2 px-1.5 py-1 hover:bg-[#000080] hover:text-white"
      onMouseEnter={onHighlight}
    >
      {stalled ? (
        <TriangleAlert className="size-4 shrink-0 text-[#c00000] group-hover:text-white" />
      ) : (
        <Icon className="size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">
          {stations.get(from)?.name ?? "?"} → {stations.get(to)?.name ?? "?"}
        </span>
        <span className="block truncate opacity-75">{status}</span>
      </span>
      <span
        className={`tabular-nums group-hover:hidden ${
          vehicle.earned < 0 ? "text-[#c00000]" : "text-[#006000]"
        }`}
      >
        {vehicle.earned > 0 ? "+" : ""}
        {formatMoney(vehicle.earned)}
      </span>
      <span className="hidden shrink-0 gap-px text-black group-hover:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="win-button size-[23px] p-0"
              aria-label="Buy another one"
              onClick={onClone}
            >
              <Copy className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={4}>
            Buy another one · {formatMoney(TRANSPORT[vehicle.kind].vehicleCost)}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="win-button size-[23px] p-0"
              aria-label="Sell"
              onClick={onSell}
            >
              <Trash2 className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={4}>
            Sell · {formatMoney(TRANSPORT[vehicle.kind].vehicleCost / 2)} back
          </TooltipContent>
        </Tooltip>
      </span>
    </li>
  );
}
