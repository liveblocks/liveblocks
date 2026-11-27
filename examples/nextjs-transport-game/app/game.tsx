"use client";

import {
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import type { ToJson } from "@liveblocks/client";
import { AvatarStack } from "@liveblocks/react-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HelpButton } from "@/components/help-button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  buildStation,
  buildTrack,
  bulldoze,
  buyVehicle,
  cloneVehicle,
  ensureCompany,
  resetGame,
  runSimulation,
  sellVehicle,
  snapshotView,
  stationCost,
  stationProblem,
} from "@/game/actions";
import { CARGO, TRACK } from "@/game/constants";
import {
  cargoBetween,
  companyBalance,
  formatMoney,
  getStationInfo,
} from "@/game/economy";
import { dueAt } from "@/game/motion";
import { buildNetwork, type Network } from "@/game/network";
import type { ActionResult, Tool, TrackKind } from "@/game/types";
import { generateWorld, INDUSTRY, WATER, type World } from "@/game/world";
import { type DragPlan, type LineTool, MapCanvas } from "./map-canvas";
import { SidePanel } from "./side-panel";
import { StationCard } from "./station-card";
import { Toolbar, TOOLS } from "./toolbar";

type Toast = {
  id: number;
  text: string;
  // News comes with the color of the company it's about. Errors have none.
  color: string | null;
};

// Vehicles are normally run by their owner. If the owner is away (or their
// tab is asleep), the player who has been in the room the longest steps in
// once a vehicle is this late.
const OVERDUE_MS = 3000;
const TICK_MS = 250;

export function Game() {
  const myId = useSelf((me) => me.id);
  const seed = useStorage((root) => root.seed);
  const roads = useStorage((root) => root.roads);
  const rails = useStorage((root) => root.rails);
  const stations = useStorageMap((root) => root.stations);
  const vehicles = useStorageMap((root) => root.vehicles);
  const companies = useStorageMap((root) => root.companies);

  // The map isn't synced: every player generates the same one from the seed
  const world = useMemo(() => generateWorld(seed), [seed]);
  const network = useMemo(
    () => buildNetwork(world, Object.keys(roads), Object.keys(rails)),
    [world, roads, rails]
  );

  const company = companies.get(myId);
  const balance = companyBalance(company, vehicles.values(), myId);

  const [tool, setTool] = useState<Tool>("select");
  const [hover, setHover] = useState<number | null>(null);
  const [dragPlan, setDragPlan] = useState<DragPlan>(null);
  const [routeFrom, setRouteFrom] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [highlightedVehicle, setHighlightedVehicle] = useState<string | null>(
    null
  );
  const { toasts, notify } = useToasts();

  useCompany(company !== undefined);
  useSimulation(world, network);

  const selectTool = useCallback((next: Tool) => {
    setTool(next);
    setRouteFrom(null);
    setDragPlan(null);
  }, []);

  // Let everyone know which tool this player is holding
  const updateMyPresence = useUpdateMyPresence();
  useEffect(() => {
    updateMyPresence({ tool });
  }, [tool, updateMyPresence]);

  // A new map starts from a clean slate
  useEffect(() => {
    setRouteFrom(null);
    setSelectedStation(null);
    setHover(null);
  }, [seed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === "Escape") {
        selectTool("select");
        setSelectedStation(null);
        return;
      }
      const match = TOOLS.find((each) => each.shortcut === event.key);
      if (match) {
        selectTool(match.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectTool]);

  // News is broadcast to everyone in the room, and shown as a toast
  const broadcast = useBroadcastEvent();
  useEventListener(({ event }) => {
    if (event.type === "news") {
      notify(event.text, event.color);
    }
  });
  const announce = (text: string) => {
    const color = company?.color ?? "#737373";
    notify(text, color);
    broadcast({ type: "news", text, color });
  };
  const reportFailure = (result: ActionResult) => {
    if (!result.ok) {
      notify(result.message, null);
    }
    return result;
  };

  const buildLine = useMutation(
    ({ storage, self }, lineTool: LineTool, tiles: number[]) =>
      lineTool === "bulldoze"
        ? bulldoze(storage, world, self.id, tiles)
        : buildTrack(storage, world, self.id, lineTool, tiles),
    [world]
  );

  const placeStation = useMutation(
    ({ storage, self }, kind: TrackKind, tile: number) =>
      buildStation(storage, world, self.id, kind, tile, Date.now()),
    [world]
  );

  const buy = useMutation(
    ({ storage, self }, from: number, to: number) =>
      buyVehicle(storage, world, network, self.id, from, to, Date.now()),
    [world, network]
  );

  const clone = useMutation(
    ({ storage, self }, vehicleId: string) =>
      cloneVehicle(storage, world, network, self.id, vehicleId, Date.now()),
    [world, network]
  );

  const sell = useMutation(
    ({ storage, self }, vehicleId: string) =>
      sellVehicle(storage, self.id, vehicleId),
    []
  );

  const reset = useMutation(
    ({ storage }) => resetGame(storage, Math.floor(Math.random() * 2 ** 31)),
    []
  );

  const describeVehicle = (kind: TrackKind, from: number, to: number) => {
    if (kind === "rail") {
      return "a train";
    }
    const cargo = [
      ...cargoBetween(world, from, to),
      ...cargoBetween(world, to, from),
    ];
    return cargo.includes("passengers") ? "a bus" : "a truck";
  };

  const onTileClick = (tile: number) => {
    const station = stations.get(String(tile));

    if (tool === "select") {
      setSelectedStation(station ? tile : null);
    } else if (tool === "road-station" || tool === "rail-station") {
      const kind = tool === "road-station" ? "road" : "rail";
      const result = reportFailure(placeStation(kind, tile));
      if (result.ok && company) {
        announce(`${company.name} opened ${result.message}`);
      }
    } else if (tool === "vehicle") {
      if (!station || station.owner !== myId) {
        notify(
          station
            ? "That station belongs to another company"
            : "Click one of your stations",
          null
        );
      } else if (routeFrom === null) {
        setRouteFrom(tile);
      } else if (routeFrom === tile) {
        setRouteFrom(null);
      } else {
        const result = reportFailure(buy(routeFrom, tile));
        if (result.ok && company) {
          const vehicle = describeVehicle(station.kind, routeFrom, tile);
          announce(`${company.name} bought ${vehicle}: ${result.message}`);
          setRouteFrom(null);
        }
      }
    }
  };

  const onClone = (vehicleId: string) => {
    const vehicle = vehicles.get(vehicleId);
    const result = reportFailure(clone(vehicleId));
    if (result.ok && company && vehicle) {
      const [from, to] = vehicle.stops.map(Number);
      const label = describeVehicle(vehicle.kind, from, to);
      announce(`${company.name} bought ${label}: ${result.message}`);
    }
  };

  const onReset = () => {
    if (
      window.confirm(
        "Start over on a new map? This removes everything all players have built."
      )
    ) {
      reset();
      announce(`${company?.name ?? "Someone"} started a new map`);
    }
  };

  const onStartRoute = (tile: number) => {
    setTool("vehicle");
    setRouteFrom(tile);
    setSelectedStation(null);
  };

  const selected =
    selectedStation !== null
      ? stations.get(String(selectedStation))
      : undefined;

  const hint = describe({
    world,
    network,
    stations,
    companies,
    tool,
    hover,
    dragPlan,
    routeFrom,
    balance,
  });

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col gap-2 bg-neutral-50 p-2">
        <header className="flex h-12 shrink-0 items-center gap-3 rounded-lg bg-white px-3 shadow ring-1 ring-neutral-950/5">
          <h1 className="text-sm font-semibold text-neutral-900">
            Transport Game
          </h1>
          {company ? (
            <div className="flex min-w-0 items-center gap-2 border-l border-neutral-200 pl-3 text-sm">
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ background: company.color }}
              />
              <span className="hidden truncate text-neutral-600 sm:block">
                {company.name}
              </span>
              <span
                className={`font-mono font-medium tabular-nums ${
                  balance < 0 ? "text-red-600" : "text-neutral-900"
                }`}
              >
                {formatMoney(balance)}
              </span>
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <AvatarStack size={28} />
            <HelpButton />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-2">
          <main className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-[#4b90d2] shadow ring-1 ring-neutral-950/5">
            <MapCanvas
              world={world}
              network={network}
              stations={stations}
              vehicles={vehicles}
              companies={companies}
              myId={myId}
              balance={balance}
              tool={tool}
              routeFrom={routeFrom}
              selectedStation={selectedStation}
              highlightedVehicle={highlightedVehicle}
              onHover={setHover}
              onDragPlan={setDragPlan}
              onLine={(lineTool, tiles) => reportFailure(buildLine(lineTool, tiles))}
              onTileClick={onTileClick}
            />

            <Toolbar tool={tool} onSelect={selectTool} />

            {selectedStation !== null && selected ? (
              <StationCard
                world={world}
                tile={selectedStation}
                station={selected}
                owner={companies.get(selected.owner)}
                vehicles={vehicles}
                mine={selected.owner === myId}
                onStartRoute={() => onStartRoute(selectedStation)}
                onClose={() => setSelectedStation(null)}
              />
            ) : null}

            <div className="pointer-events-none absolute bottom-14 left-3 flex flex-col items-start gap-1.5">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className="flex animate-in items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 shadow ring-1 ring-neutral-950/5 fade-in slide-in-from-bottom-1"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: toast.color ?? "#dc2626" }}
                  />
                  {toast.text}
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-5rem)] truncate rounded-md bg-neutral-900/85 px-2.5 py-1.5 text-xs font-medium text-white shadow">
              {hint}
            </div>
          </main>

          <SidePanel
            world={world}
            myId={myId}
            stations={stations}
            vehicles={vehicles}
            companies={companies}
            onHighlight={setHighlightedVehicle}
            onClone={onClone}
            onSell={(vehicleId) => reportFailure(sell(vehicleId))}
            onReset={onReset}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// `useStorage` returns each LiveMap as a read-only plain object. The game
// logic and the renderer look things up by key a lot, so they get a Map.
function useStorageMap<T>(
  selector: (root: ToJson<Liveblocks["Storage"]>) => Readonly<Record<string, T>>
): ReadonlyMap<string, T> {
  const record = useStorage(selector);
  return useMemo(() => new Map(Object.entries(record)), [record]);
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((text: string, color: string | null) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-3), { id, text, color }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  return { toasts, notify };
}

// Founds this player's company the first time they join (or after a new map)
function useCompany(exists: boolean) {
  const found = useMutation(({ storage, self }) => {
    ensureCompany(storage, self.id, self.info, Date.now());
  }, []);

  useEffect(() => {
    if (!exists) {
      found();
    }
  }, [exists, found]);
}

// There is no game server: players' browsers move the vehicles. A vehicle
// only needs attention when it reaches a station, so a few times per second
// each client checks if any vehicle it is responsible for has arrived.
function useSimulation(world: World, network: Network) {
  const latest = useRef({ world, network });
  useEffect(() => {
    latest.current = { world, network };
  });

  const tick = useMutation(({ storage, self, others }) => {
    const now = Date.now();
    const online = new Set(others.map((other) => other.id));
    const isHost = others.every(
      (other) => other.connectionId > self.connectionId
    );

    runSimulation(
      storage,
      latest.current.world,
      latest.current.network,
      now,
      (vehicle) =>
        vehicle.owner === self.id ||
        (isHost &&
          (!online.has(vehicle.owner) || dueAt(vehicle) < now - OVERDUE_MS))
    );
  }, []);

  useEffect(() => {
    const interval = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(interval);
  }, [tick]);
}

// The line of text at the bottom of the map: what the current tool does, or
// what's under the cursor
function describe({
  world,
  network,
  stations,
  companies,
  tool,
  hover,
  dragPlan,
  routeFrom,
  balance,
}: {
  world: World;
  network: Network;
  stations: ReadonlyMap<string, { owner: string; kind: TrackKind; name: string }>;
  companies: ReadonlyMap<string, { name: string }>;
  tool: Tool;
  hover: number | null;
  dragPlan: DragPlan;
  routeFrom: number | null;
  balance: number;
}) {
  if (tool === "road" || tool === "rail") {
    const { label, cost } = TRACK[tool];
    if (dragPlan) {
      return (
        dragPlan.problem ??
        `${label} · ${dragPlan.tiles} ${dragPlan.tiles === 1 ? "tile" : "tiles"} · ${formatMoney(dragPlan.cost)}`
      );
    }
    return `${label} · Drag across the map to build · ${formatMoney(cost)} per tile`;
  }

  if (tool === "bulldoze") {
    return dragPlan
      ? `Clear ${dragPlan.tiles} ${dragPlan.tiles === 1 ? "tile" : "tiles"}`
      : "Clear · Click or drag over your own tracks and stations to remove them";
  }

  if (tool === "road-station" || tool === "rail-station") {
    const kind = tool === "road-station" ? "road" : "rail";
    const { stationLabel, stationCost: baseCost } = TRACK[kind];
    if (hover === null) {
      return `${stationLabel} · Click next to a town or an industry · ${formatMoney(baseCost)}`;
    }
    const view = snapshotView(network, stations);
    const problem = stationProblem(world, view, kind, hover);
    if (problem) {
      return problem;
    }
    const cost = stationCost(world, view, kind, hover);
    if (cost > balance) {
      return "Not enough money";
    }
    const info = getStationInfo(world, hover);
    const supplies = info.supply.map((entry) => CARGO[entry.cargo].label);
    const accepts = info.accepts.map((cargo) => CARGO[cargo].label);
    const serves =
      supplies.length + accepts.length === 0
        ? "nothing in range"
        : [
            supplies.length > 0 ? `picks up ${supplies.join(", ")}` : null,
            accepts.length > 0 ? `accepts ${accepts.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join(" · ");
    return `${stationLabel} · ${formatMoney(cost)} · ${serves}`;
  }

  if (tool === "vehicle") {
    if (routeFrom === null) {
      return "Vehicle · Click one of your stations to start a route";
    }
    const from = stations.get(String(routeFrom));
    const cost = TRACK[from?.kind ?? "road"].vehicleCost;
    return `Vehicle · Now click the station to go to · ${formatMoney(cost)}`;
  }

  if (hover === null) {
    return "Drag to move around · Scroll to zoom · Click a station to inspect it";
  }

  const station = stations.get(String(hover));
  if (station) {
    return `${station.name} · ${companies.get(station.owner)?.name ?? "Unknown"}`;
  }
  if (world.industryAt[hover] >= 0) {
    const industry = world.industries[world.industryAt[hover]];
    const { produces, accepts } = INDUSTRY[industry.type];
    if (produces) {
      return `${industry.name} · Produces ${CARGO[produces].label.toLowerCase()}`;
    }
    return `${industry.name} · Accepts ${accepts ? CARGO[accepts].label.toLowerCase() : "nothing"}`;
  }
  if (world.houseAt[hover] >= 0) {
    return `${world.towns[world.houses[world.houseAt[hover]].town].name} · Houses supply and accept passengers`;
  }
  if (network.rail[hover]) {
    return "Railway";
  }
  if (network.road[hover]) {
    return world.townRoads[hover] ? "Town street · Anyone can drive on it" : "Road";
  }
  if (world.terrain[hover] === WATER) {
    return "Water · Roads and railways cross it on bridges";
  }
  return world.trees[hover] > 0 ? "Woodland" : "Open land";
}
