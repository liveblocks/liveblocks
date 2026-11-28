"use client";

import { Copy, LocateFixed, Trash2 } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { Window } from "@/components/window";
import { gameTime } from "@/game/clock";
import { CARGO } from "@/game/constants";
import { cargoBetween, formatMoney, loadOf } from "@/game/economy";
import {
  capacityOf,
  modelOf,
  type PathPoint,
  priceOf,
  runningCostOf,
  vehiclePoint,
} from "@/game/motion";
import type { MapView } from "@/game/render/renderer";
import { worldX, worldY } from "@/game/render/shapes";
import { isHeldUp } from "@/game/simulation";
import type { Stations } from "@/game/stations";
import type { CompanyData, Transport, Vehicle } from "@/game/types";
import type { World } from "@/game/world";
import { useNow } from "@/hooks/use-now";

// What players call a vehicle depends on what it would carry between two
// stations
export function vehicleKind(
  world: World,
  kind: Transport,
  from: readonly number[],
  to: readonly number[]
) {
  if (kind === "rail") {
    return "Train";
  }
  const passengers =
    cargoBetween(world, from, to).includes("passengers") ||
    cargoBetween(world, to, from).includes("passengers");
  if (kind === "water") {
    return passengers ? "Ferry" : "Ship";
  }
  return passengers ? "Bus" : "Truck";
}

export function vehicleName(
  world: World,
  vehicle: Vehicle,
  stations: Stations
) {
  const [from, to] = vehicle.stops.map(
    (stop) => stations.at(stop)?.tiles ?? []
  );
  return vehicleKind(world, vehicle.kind, from, to);
}

// What a vehicle is up to, in a few words. `bad` is for what its owner
// should do something about.
export function vehicleState(
  vehicle: Vehicle,
  time: number,
  destination: string
) {
  if (vehicle.status === "wreck") {
    return { text: "Wrecked in a crash", bad: true };
  }
  if (vehicle.status === "lost") {
    return { text: `Can't find a way to ${destination}`, bad: true };
  }
  if (vehicle.status === "dock") {
    if (vehicle.leg < 0) {
      return { text: "Waiting to leave its depot", bad: false };
    }
    return {
      text:
        time < vehicle.departAt
          ? "Loading"
          : "Waiting for the way out to clear",
      bad: false,
    };
  }
  if (isHeldUp(vehicle, time)) {
    return {
      text:
        vehicle.kind === "rail"
          ? "Waiting at a signal"
          : "Waiting for the way ahead to clear",
      bad: false,
    };
  }
  return { text: `Heading to ${destination}`, bad: false };
}

// A small view of the map that keeps the vehicle in the middle. Like the
// map itself, it is drawn on every animation frame without going through
// React.
function VehicleCamera({
  view,
  vehicleId,
  size,
}: {
  view: RefObject<MapView | null>;
  vehicleId: string;
  size: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    const point: PathPoint = { x: 0, y: 0, dx: 1, dy: 0 };
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const current = view.current;
      const vehicle = current?.scene.vehicles.get(vehicleId);
      if (!current || !vehicle) {
        return;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      if (canvas.width !== Math.round(width * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const now = Date.now();
      vehiclePoint(vehicle, size, gameTime(current.scene.clock, now), point);
      current.renderer.render(
        ctx,
        { width, height, dpr },
        {
          x: worldX(point.x, point.y),
          y: worldY(point.x, point.y) - 6,
          zoom: 1,
        },
        current.scene,
        now,
        true
      );
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [view, vehicleId, size]);

  return (
    <canvas
      ref={canvasRef}
      className="win-inset block h-32 w-full"
      aria-label="A view of the map that follows this vehicle"
    />
  );
}

// Opens when a vehicle is clicked, on the map or in the list of vehicles
export function VehicleWindow({
  world,
  vehicleId,
  vehicle,
  stations,
  owner,
  mine,
  following,
  view,
  onFollow,
  onClone,
  onSell,
  onClose,
}: {
  world: World;
  vehicleId: string;
  vehicle: Vehicle;
  stations: Stations;
  owner: CompanyData | undefined;
  mine: boolean;
  // Whether the map itself is following this vehicle around
  following: boolean;
  view: RefObject<MapView | null>;
  onFollow: (follow: boolean) => void;
  onClone: () => void;
  onSell: () => void;
  onClose: () => void;
}) {
  const now = useNow(500);
  const count = vehicle.stops.length;
  // A new vehicle is on its way from its depot to its first station
  const from = vehicle.leg < 0 ? null : vehicle.stops[vehicle.leg % count];
  const to = vehicle.stops[(vehicle.leg + 1) % count];
  const nameOf = (key: string) => stations.at(key)?.name ?? "?";

  const model = modelOf(vehicle);
  const capacity = capacityOf(model, vehicle.cars);
  const price = priceOf(model, vehicle.cars);
  const wrecked = vehicle.status === "wreck";
  const onBoard = loadOf(vehicle);
  const carried = onBoard.reduce((sum, { amount }) => sum + amount, 0);
  const state = vehicleState(vehicle, now, nameOf(to));

  let cargo = `Nothing: ${nameOf(to)} doesn't take what ${from === null ? "it has" : nameOf(from)} has`;
  if (from === null) {
    cargo = `Nothing yet: it loads at ${nameOf(to)}`;
  } else if (onBoard.length > 0) {
    cargo = onBoard
      .map(
        ({ cargo, amount }) => `${amount} ${CARGO[cargo].label.toLowerCase()}`
      )
      .join(" and ");
  }

  return (
    <Window
      title={`${model.name} · ${vehicleName(world, vehicle, stations)}`}
      className="w-64"
      onClose={onClose}
    >
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <VehicleCamera view={view} vehicleId={vehicleId} size={world.size} />

        <p className="flex items-center gap-1.5">
          <span
            className="size-3 shrink-0 border border-ui-edge"
            style={{ background: owner?.color ?? "#a3a3a3" }}
          />
          <span className="truncate">{owner?.name ?? "Unknown"}</span>
        </p>
        <p>
          <span className="font-bold">
            {nameOf(vehicle.stops[0])} ↔ {nameOf(vehicle.stops[1])}
          </span>
          <br />
          <span className={state.bad ? "text-ui-bad" : ""}>{state.text}</span>
        </p>

        <div>
          <div className="flex justify-between">
            <span className="font-bold">On board</span>
            <span className="tabular-nums">
              {carried} of {capacity}
            </span>
          </div>
          <div className="h-2 border border-ui-line bg-ui-field">
            <div
              className="h-full bg-ui-accent"
              style={{ width: `${Math.min(1, carried / capacity) * 100}%` }}
            />
          </div>
          <p>{cargo}</p>
        </div>

        <dl className="win-inset grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-1.5 py-1">
          <dt>Last delivery</dt>
          <dd className="text-right tabular-nums">
            {vehicle.trips === 0 ? "None yet" : formatMoney(vehicle.lastIncome)}
          </dd>
          <dt>Profit so far</dt>
          <dd
            className={`text-right font-bold tabular-nums ${
              vehicle.earned < 0 ? "text-ui-bad" : "text-ui-good"
            }`}
          >
            {formatMoney(vehicle.earned)}
          </dd>
          <dt>Trips</dt>
          <dd className="text-right tabular-nums">{vehicle.trips}</dd>
          {vehicle.kind === "rail" ? (
            <>
              <dt>Carriages</dt>
              <dd className="text-right tabular-nums">{vehicle.cars}</dd>
            </>
          ) : null}
          <dt>Speed</dt>
          <dd className="text-right tabular-nums">
            {model.speed} tiles a second
          </dd>
          <dt>Running cost</dt>
          <dd className="text-right tabular-nums">
            {formatMoney(runningCostOf(model, vehicle.cars))} a tile
          </dd>
        </dl>

        <div className="flex justify-end gap-px">
          <button
            type="button"
            className="win-button mr-auto flex items-center gap-1"
            aria-pressed={following}
            onClick={() => onFollow(!following)}
          >
            <LocateFixed className="size-3.5" />
            Follow
          </button>
          {mine && !wrecked ? (
            <>
              <button
                type="button"
                className="win-button flex items-center gap-1"
                title={`Buy another one for ${formatMoney(price)}`}
                onClick={onClone}
              >
                <Copy className="size-3.5" />
                Copy
              </button>
              <button
                type="button"
                className="win-button flex items-center gap-1"
                title={`Sell it for ${formatMoney(Math.round(price / 2))}`}
                onClick={onSell}
              >
                <Trash2 className="size-3.5" />
                Sell
              </button>
            </>
          ) : null}
        </div>
      </div>
    </Window>
  );
}
