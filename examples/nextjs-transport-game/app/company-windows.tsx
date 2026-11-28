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
import { CARGO, MAX_VEHICLES_PER_COMPANY } from "@/game/constants";
import { companyBalance, formatMoney, loadOf } from "@/game/economy";
import { modelOf, priceOf } from "@/game/motion";
import type { Stations } from "@/game/stations";
import type { CompanyData, Vehicle } from "@/game/types";
import type { World } from "@/game/world";
import { useNow } from "@/hooks/use-now";
import { vehicleName, vehicleState } from "./vehicle-window";

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
          <li className="px-1.5 py-1 text-ui-faint">No company started yet</li>
        ) : null}
        {ranking.map((entry, index) => (
          <li
            key={entry.id}
            className={`flex items-center gap-2 px-1.5 py-1 ${
              entry.id === myCompany ? "bg-ui-accent text-ui-accent-text" : ""
            }`}
          >
            <span className="w-3 tabular-nums">{index + 1}</span>
            <span
              className="size-3 shrink-0 border border-ui-edge"
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
                entry.balance < 0 && entry.id !== myCompany ? "text-ui-bad" : ""
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
  onSelect,
  onClone,
  onSell,
  onClose,
}: {
  world: World;
  myCompany: string;
  stations: Stations;
  vehicles: ReadonlyMap<string, Vehicle>;
  onHighlight: (vehicleId: string | null) => void;
  // Opens the vehicle's own window
  onSelect: (vehicleId: string) => void;
  onClone: (vehicleId: string) => void;
  onSell: (vehicleId: string) => void;
  onClose: () => void;
}) {
  const mine = [...vehicles].filter(
    ([, vehicle]) => vehicle.owner === myCompany
  );

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
          <li>
            Build a garage, an engine shed or a shipyard next to that road,
            railway or water.
          </li>
          <li>Click it, choose a vehicle, and then click both stations.</li>
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
              onSelect={() => onSelect(id)}
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
  onSelect,
  onClone,
  onSell,
}: {
  world: World;
  vehicle: Vehicle;
  stations: Stations;
  onHighlight: () => void;
  onSelect: () => void;
  onClone: () => void;
  onSell: () => void;
}) {
  const now = useNow();
  const [from, to] = vehicle.stops;
  let Icon = vehicleName(world, vehicle, stations) === "Bus" ? Bus : Truck;
  if (vehicle.kind === "rail") {
    Icon = TrainFront;
  } else if (vehicle.kind === "water") {
    Icon = Ship;
  }
  const model = modelOf(vehicle);
  const price = priceOf(model, vehicle.cars);
  const wrecked = vehicle.status === "wreck";
  const state = vehicleState(vehicle, now, "its next station");
  const stalled = state.bad;
  const onBoard = loadOf(vehicle);

  // What it is waiting for says more than what it is carrying
  let status = state.text;
  if (status.startsWith("Heading") && onBoard.length > 0) {
    status = `Carrying ${onBoard
      .map(
        ({ cargo, amount }) => `${amount} ${CARGO[cargo].label.toLowerCase()}`
      )
      .join(" and ")}`;
  } else if (status.startsWith("Heading")) {
    status =
      vehicle.leg < 0 ? "Heading to its first station" : "Heading out empty";
  }

  return (
    <li
      className="group flex items-center gap-2 px-1.5 py-1 hover:bg-ui-accent hover:text-ui-accent-text"
      onMouseEnter={onHighlight}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        aria-label="Show this vehicle"
        onClick={onSelect}
      >
        {stalled ? (
          <TriangleAlert className="size-4 shrink-0 text-ui-bad group-hover:text-ui-accent-text" />
        ) : (
          <Icon className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {stations.at(from)?.name ?? "?"} → {stations.at(to)?.name ?? "?"}
          </span>
          <span className="block truncate opacity-75">
            {model.name}
            {vehicle.kind === "rail" ? ` + ${vehicle.cars}` : ""} · {status}
          </span>
        </span>
      </button>
      <span
        className={`tabular-nums group-hover:hidden ${
          vehicle.earned < 0 ? "text-ui-bad" : "text-ui-good"
        }`}
      >
        {vehicle.earned > 0 ? "+" : ""}
        {formatMoney(vehicle.earned)}
      </span>
      <span
        className={`hidden shrink-0 gap-px text-ui-text ${wrecked ? "" : "group-hover:flex"}`}
      >
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
            Buy another one · {formatMoney(price)}
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
            Sell · {formatMoney(Math.round(price / 2))} back
          </TooltipContent>
        </Tooltip>
      </span>
    </li>
  );
}
