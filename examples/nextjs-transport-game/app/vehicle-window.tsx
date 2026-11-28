"use client";

import { Copy, LocateFixed, Trash2 } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { Window } from "@/components/window";
import { gameTime } from "@/game/clock";
import { CARGO, TRANSPORT } from "@/game/constants";
import { cargoBetween, formatMoney, loadOf } from "@/game/economy";
import { type PathPoint, vehiclePoint } from "@/game/motion";
import type { MapView } from "@/game/render/renderer";
import { worldX, worldY } from "@/game/render/shapes";
import type { CompanyData, StationData, Vehicle } from "@/game/types";
import type { World } from "@/game/world";
import { useClock } from "@/hooks/use-now";

// What players call a vehicle depends on what it carries
export function vehicleName(world: World, vehicle: Vehicle) {
  if (vehicle.kind === "rail") {
    return "Train";
  }
  const [from, to] = vehicle.stops.map(Number);
  const passengers =
    cargoBetween(world, from, to).includes("passengers") ||
    cargoBetween(world, to, from).includes("passengers");
  if (vehicle.kind === "water") {
    return passengers ? "Ferry" : "Ship";
  }
  return passengers ? "Bus" : "Truck";
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
  stations: ReadonlyMap<string, StationData>;
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
  const clock = useClock();
  const count = vehicle.stops.length;
  const from = vehicle.stops[vehicle.leg % count];
  const to = vehicle.stops[(vehicle.leg + 1) % count];
  const nameOf = (key: string) => stations.get(key)?.name ?? "?";

  const { capacity, speed, runningCost, vehicleCost } = TRANSPORT[vehicle.kind];
  const onBoard = loadOf(vehicle);
  const carried = onBoard.reduce((sum, { amount }) => sum + amount, 0);
  const stalled =
    vehicle.path.length < 2 && vehicle.departAt > gameTime(clock, Date.now());

  let status = `Heading to ${nameOf(to)}`;
  if (stalled) {
    status = `Can't find a way to ${nameOf(to)}`;
  } else if (vehicle.path.length < 2) {
    status = "Getting ready";
  }

  return (
    <Window
      title={vehicleName(world, vehicle)}
      className="w-64"
      onClose={onClose}
    >
      <div className="flex flex-col gap-1.5 px-1 pt-1.5 pb-1">
        <VehicleCamera view={view} vehicleId={vehicleId} size={world.size} />

        <p className="flex items-center gap-1.5">
          <span
            className="size-3 shrink-0 border border-black"
            style={{ background: owner?.color ?? "#a3a3a3" }}
          />
          <span className="truncate">{owner?.name ?? "Unknown"}</span>
        </p>
        <p>
          <span className="font-bold">
            {nameOf(vehicle.stops[0])} ↔ {nameOf(vehicle.stops[1])}
          </span>
          <br />
          <span className={stalled ? "text-[#c00000]" : ""}>{status}</span>
        </p>

        <div>
          <div className="flex justify-between">
            <span className="font-bold">On board</span>
            <span className="tabular-nums">
              {carried} of {capacity}
            </span>
          </div>
          <div className="h-2 border border-[#808080] bg-white">
            <div
              className="h-full bg-[#000080]"
              style={{ width: `${Math.min(1, carried / capacity) * 100}%` }}
            />
          </div>
          <p>
            {onBoard.length === 0
              ? `Nothing: ${nameOf(to)} doesn't take what ${nameOf(from)} has`
              : onBoard
                  .map(
                    ({ cargo, amount }) =>
                      `${amount} ${CARGO[cargo].label.toLowerCase()}`
                  )
                  .join(" and ")}
          </p>
        </div>

        <dl className="win-inset grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-1.5 py-1">
          <dt>Last delivery</dt>
          <dd className="text-right tabular-nums">
            {vehicle.trips === 0 ? "None yet" : formatMoney(vehicle.lastIncome)}
          </dd>
          <dt>Profit so far</dt>
          <dd
            className={`text-right font-bold tabular-nums ${
              vehicle.earned < 0 ? "text-[#c00000]" : "text-[#006000]"
            }`}
          >
            {formatMoney(vehicle.earned)}
          </dd>
          <dt>Trips</dt>
          <dd className="text-right tabular-nums">{vehicle.trips}</dd>
          <dt>Speed</dt>
          <dd className="text-right tabular-nums">{speed} tiles a second</dd>
          <dt>Running cost</dt>
          <dd className="text-right tabular-nums">
            {formatMoney(runningCost)} a tile
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
          {mine ? (
            <>
              <button
                type="button"
                className="win-button flex items-center gap-1"
                title={`Buy another one for ${formatMoney(vehicleCost)}`}
                onClick={onClone}
              >
                <Copy className="size-3.5" />
                Copy
              </button>
              <button
                type="button"
                className="win-button flex items-center gap-1"
                title={`Sell it for ${formatMoney(vehicleCost / 2)}`}
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
