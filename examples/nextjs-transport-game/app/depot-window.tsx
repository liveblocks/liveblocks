"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Window } from "@/components/window";
import type { Order } from "@/game/actions";
import {
  CARS_PER_PLATFORM_TILE,
  DEFAULT_CARS,
  DEFAULT_MODEL,
  MODELS,
  TRANSPORT,
} from "@/game/constants";
import { formatMoney } from "@/game/economy";
import { capacityOf, priceOf, runningCostOf } from "@/game/motion";
import type { CompanyData, DepotData } from "@/game/types";

// Opens when a depot is clicked: this is where vehicles are bought. The
// player picks one here, and then clicks the two stations it should run
// between on the map.
export function DepotWindow({
  tile,
  depot,
  owner,
  mine,
  balance,
  order,
  routeFrom,
  onOrder,
  onClose,
}: {
  tile: number;
  depot: DepotData;
  owner: CompanyData | undefined;
  mine: boolean;
  balance: number;
  // What is being bought here right now, while its stations are picked
  order: Order | null;
  // The name of the first station that was picked for it
  routeFrom: string | null;
  onOrder: (order: Order | null) => void;
  onClose: () => void;
}) {
  const { kind } = depot;
  const models = MODELS.filter((model) => model.kind === kind);
  const [modelId, setModelId] = useState(DEFAULT_MODEL[kind]);
  const [wanted, setWanted] = useState(DEFAULT_CARS);
  const model = models.find((each) => each.id === modelId) ?? models[0];
  const maxCars = model.maxCars ?? 0;
  const cars = kind === "rail" ? Math.max(1, Math.min(maxCars, wanted)) : 0;
  const price = priceOf(model, cars);
  const { depotLabel, stationLabel, vehicleLabel } = TRANSPORT[kind];
  const picking = order !== null;

  return (
    <Window title={depotLabel} className="w-72" onClose={onClose}>
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <p className="flex items-center gap-1.5">
          <span
            className="size-3 shrink-0 border border-ui-edge"
            style={{ background: owner?.color ?? "#a3a3a3" }}
          />
          <span className="truncate">{owner?.name ?? "Unknown"}</span>
        </p>

        {mine ? (
          <>
            <ul className="win-inset flex flex-col" role="radiogroup">
              {models.map((each) => (
                <li key={each.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={each.id === model.id}
                    disabled={picking}
                    className={`flex w-full flex-col px-1.5 py-1 text-left ${
                      each.id === model.id
                        ? "bg-ui-accent text-ui-accent-text"
                        : ""
                    }`}
                    onClick={() => setModelId(each.id)}
                  >
                    <span className="flex justify-between gap-2">
                      <span className="font-bold">{each.name}</span>
                      <span className="tabular-nums">
                        {formatMoney(each.cost)}
                      </span>
                    </span>
                    <span className="opacity-75">{each.detail}</span>
                    <span className="opacity-75">
                      {kind === "rail"
                        ? `Pulls up to ${each.maxCars} carriages`
                        : `Carries ${each.capacity}`}{" "}
                      · {each.speed} tiles a second
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {kind === "rail" ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="mr-auto font-bold">Carriages</span>
                  <button
                    type="button"
                    className="win-button size-[23px] p-0"
                    aria-label="One carriage fewer"
                    disabled={picking || cars <= 1}
                    onClick={() => setWanted(cars - 1)}
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-5 text-center font-bold tabular-nums">
                    {cars}
                  </span>
                  <button
                    type="button"
                    className="win-button size-[23px] p-0"
                    aria-label="One carriage more"
                    disabled={picking || cars >= maxCars}
                    onClick={() => setWanted(cars + 1)}
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <p className="text-ui-muted">
                  Only the carriages at the platform load and unload: this train
                  needs {Math.ceil(cars / CARS_PER_PLATFORM_TILE)} tiles of it.
                </p>
              </div>
            ) : null}

            <dl className="win-inset grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-1.5 py-1">
              <dt>Carries</dt>
              <dd className="text-right tabular-nums">
                {capacityOf(model, cars)}
              </dd>
              <dt>Running cost</dt>
              <dd className="text-right tabular-nums">
                {formatMoney(runningCostOf(model, cars))} a tile
              </dd>
              <dt>Price</dt>
              <dd
                className={`text-right font-bold tabular-nums ${
                  price > balance ? "text-ui-bad" : ""
                }`}
              >
                {formatMoney(price)}
              </dd>
            </dl>

            {picking ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 font-bold">
                  {routeFrom === null
                    ? `Click the ${stationLabel.toLowerCase()} it starts from`
                    : `From ${routeFrom}. Now click the ${stationLabel.toLowerCase()} it goes to`}
                </p>
                <button
                  type="button"
                  className="win-button"
                  onClick={() => onOrder(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="win-button self-end"
                disabled={price > balance}
                onClick={() => onOrder({ depot: tile, model: model.id, cars })}
              >
                Buy, then pick its route
              </button>
            )}
          </>
        ) : (
          <p className="text-ui-muted">
            {vehicleLabel}s are bought here. This one belongs to another
            company.
          </p>
        )}
      </div>
    </Window>
  );
}
