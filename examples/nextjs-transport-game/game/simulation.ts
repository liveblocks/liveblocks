import { CARGO, CATCHUP_MS, LOAD_MS, RETRY_MS, TRANSPORT } from "./constants";
import { getStationInfo, loadOf, stockAt, tileDistance } from "./economy";
import { dueAt } from "./motion";
import { findPath, gridOf, type Network } from "./network";
import type { Load, StationData, Stock, Vehicle } from "./types";
import type { World } from "./world";

const MAX_EVENTS = 500;

// A copy of a vehicle that is being moved along
type Draft = { -readonly [K in keyof Vehicle]: Vehicle[K] };

export type SimulationResult = {
  // Vehicles that reached a station, with their next leg planned
  vehicles: Map<string, Vehicle>;
  // Stations that vehicles loaded cargo from
  stocks: Map<string, Stock>;
};

// Runs every vehicle that is due up to `now`. Vehicles don't tick: each one
// stores the leg it is on and when it departed, and only needs attention when
// it reaches the end of that leg. This function handles those arrivals in
// chronological order and returns what changed.
//
// It is deterministic. Two clients running it for the same vehicle at the
// same moment compute the exact same update, so it doesn't matter if they
// both write it to Storage.
export function advance(
  world: World,
  network: Network,
  vehicles: ReadonlyMap<string, Vehicle>,
  stations: ReadonlyMap<string, StationData>,
  now: number
): SimulationResult {
  const changedVehicles = new Map<string, Vehicle>();
  const changedStocks = new Map<string, Stock>();

  const vehicleOf = (id: string) =>
    changedVehicles.get(id) ?? vehicles.get(id)!;
  const stationOf = (key: string): StationData | undefined => {
    const station = stations.get(key);
    const stock = changedStocks.get(key);
    return station && stock ? { ...station, stock } : station;
  };

  const arrive = (vehicle: Draft) => {
    const count = vehicle.stops.length;
    const fromKey = vehicle.stops[vehicle.leg % count];
    const toKey = vehicle.stops[(vehicle.leg + 1) % count];
    const destination = stationOf(toKey);

    let income = 0;
    if (destination) {
      const accepted = getStationInfo(world, Number(toKey)).accepts;
      const distance = tileDistance(world, Number(fromKey), Number(toKey));
      for (const { cargo, amount } of loadOf(vehicle)) {
        if (accepted.includes(cargo)) {
          income += amount * Math.max(1, distance) * CARGO[cargo].rate;
        }
      }
    }
    const runningCost =
      (vehicle.path.length - 1) * TRANSPORT[vehicle.kind].runningCost;

    vehicle.earned += Math.round(income - runningCost);
    vehicle.lastIncome = Math.round(income);
    vehicle.trips += 1;
    vehicle.leg = (vehicle.leg + 1) % count;
    vehicle.load = {};
    vehicle.path = [];
  };

  const depart = (vehicle: Draft, time: number) => {
    const count = vehicle.stops.length;
    const fromKey = vehicle.stops[vehicle.leg % count];
    const toKey = vehicle.stops[(vehicle.leg + 1) % count];
    const from = stationOf(fromKey);
    const to = stationOf(toKey);

    const path =
      from && to
        ? findPath(
            gridOf(network, vehicle.kind),
            world.size,
            Number(fromKey),
            Number(toKey)
          )
        : null;

    if (!from || !path || path.length < 2) {
      // A station or a piece of track is gone. Wait and try again later.
      vehicle.path = [];
      vehicle.departAt = time + RETRY_MS;
      return;
    }

    // Load every kind of cargo that the destination accepts. A station can
    // have several, e.g. passengers from a town and coal from a mine next to
    // it. When more is waiting than fits, the room on board is split evenly
    // between the kinds, and what one kind leaves unused goes to the others.
    const accepted = getStationInfo(world, Number(toKey)).accepts;
    const waiting = getStationInfo(world, Number(fromKey))
      .supply.filter((supply) => accepted.includes(supply.cargo))
      .map(({ cargo, rate }) => ({
        cargo,
        amount: stockAt(from, cargo, rate, time),
      }))
      .sort((a, b) => a.amount - b.amount);

    const load: Load = {};
    const stock = { ...from.stock };
    let room = TRANSPORT[vehicle.kind].capacity;
    waiting.forEach(({ cargo, amount }, index) => {
      const fairShare = Math.floor(room / (waiting.length - index));
      const taken = Math.min(Math.floor(amount), fairShare);
      if (taken > 0) {
        load[cargo] = taken;
        stock[cargo] = { amount: amount - taken, at: time };
        room -= taken;
      }
    });
    if (Object.keys(load).length > 0) {
      changedStocks.set(fromKey, stock);
    }

    vehicle.path = path;
    vehicle.departAt = time + LOAD_MS;
    vehicle.load = load;
  };

  for (let event = 0; event < MAX_EVENTS; event++) {
    let nextId: string | null = null;
    let nextDue = Infinity;
    for (const id of vehicles.keys()) {
      const due = dueAt(vehicleOf(id));
      if (due <= now && due < nextDue) {
        nextId = id;
        nextDue = due;
      }
    }
    if (nextId === null) {
      break;
    }

    // If nobody was around to run this vehicle for a while, don't replay
    // hours of trips: pick it up from a minute ago.
    const time = Math.max(nextDue, now - CATCHUP_MS);
    const vehicle: Draft = { ...vehicleOf(nextId) };
    if (vehicle.path.length >= 2) {
      arrive(vehicle);
    }
    depart(vehicle, time);
    changedVehicles.set(nextId, vehicle);
  }

  return { vehicles: changedVehicles, stocks: changedStocks };
}
