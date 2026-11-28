import { CARGO, CATCHUP_MS, LOAD_MS, RETRY_MS, TRANSPORT } from "./constants";
import {
  getStationInfo,
  industryState,
  industryStock,
  loadFromIndustry,
  loadOf,
  tileDistance,
  waitingAt,
} from "./economy";
import { dueAt } from "./motion";
import { findPath, gridOf, type Network } from "./network";
import type { IndustryState, Load, StationData, Stock, Vehicle } from "./types";
import { type Industry, INDUSTRY, type World } from "./world";

const MAX_EVENTS = 500;

// A copy of a vehicle that is being moved along
type Draft = { -readonly [K in keyof Vehicle]: Vehicle[K] };

export type SimulationResult = {
  // Vehicles that reached a station, with their next leg planned
  vehicles: Map<string, Vehicle>;
  // Stations that vehicles loaded passengers from
  stocks: Map<string, Stock>;
  // Industries that vehicles loaded from or delivered to, by id
  industries: Map<string, IndustryState>;
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
  industries: ReadonlyMap<string, IndustryState>,
  startedAt: number,
  now: number
): SimulationResult {
  const changedVehicles = new Map<string, Vehicle>();
  const changedStocks = new Map<string, Stock>();
  const changedIndustries = new Map<string, IndustryState>();

  const vehicleOf = (id: string) =>
    changedVehicles.get(id) ?? vehicles.get(id)!;
  const stationOf = (key: string): StationData | undefined => {
    const station = stations.get(key);
    const stock = changedStocks.get(key);
    return station && stock ? { ...station, stock } : station;
  };
  const industryOf = (industry: Industry) =>
    changedIndustries.get(String(industry.id)) ??
    industryState(industries.get(String(industry.id)), startedAt);

  const arrive = (vehicle: Draft) => {
    const count = vehicle.stops.length;
    const fromKey = vehicle.stops[vehicle.leg % count];
    const toKey = vehicle.stops[(vehicle.leg + 1) % count];
    const destination = stationOf(toKey);

    let income = 0;
    if (destination) {
      const { accepts, industries: nearby } = getStationInfo(
        world,
        Number(toKey)
      );
      const distance = tileDistance(world, Number(fromKey), Number(toKey));
      for (const { cargo, amount } of loadOf(vehicle)) {
        if (!accepts.includes(cargo)) {
          continue;
        }
        income += amount * Math.max(1, distance) * CARGO[cargo].rate;
        // Freight ends up at the industry that wanted it
        const buyer = nearby.find(
          (industry) => INDUSTRY[industry.type].accepts === cargo
        );
        if (buyer) {
          const state = industryOf(buyer);
          changedIndustries.set(String(buyer.id), {
            ...state,
            received: state.received + amount,
          });
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
    const waiting = waitingAt(world, Number(fromKey), from, industryOf, time)
      .filter((supply) => accepted.includes(supply.cargo))
      .sort((a, b) => a.amount - b.amount);

    const load: Load = {};
    const stock = { ...from.stock };
    let room = TRANSPORT[vehicle.kind].capacity;
    waiting.forEach(({ cargo, amount }, index) => {
      const fairShare = Math.floor(room / (waiting.length - index));
      const taken = Math.min(Math.floor(amount), fairShare);
      if (taken <= 0) {
        return;
      }
      load[cargo] = taken;
      room -= taken;
      if (cargo === "passengers") {
        stock[cargo] = { amount: amount - taken, at: time };
        changedStocks.set(fromKey, stock);
        return;
      }
      // Freight comes off the piles of the industries that make it
      let left = taken;
      for (const industry of getStationInfo(world, Number(fromKey))
        .industries) {
        if (INDUSTRY[industry.type].produces !== cargo || left <= 0) {
          continue;
        }
        const state = industryOf(industry);
        const part = Math.min(
          left,
          Math.floor(industryStock(industry, state, time))
        );
        if (part > 0) {
          changedIndustries.set(
            String(industry.id),
            loadFromIndustry(industry, state, part, time)
          );
          left -= part;
        }
      }
    });

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

  return {
    vehicles: changedVehicles,
    stocks: changedStocks,
    industries: changedIndustries,
  };
}
