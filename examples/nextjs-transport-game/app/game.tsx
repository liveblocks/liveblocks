"use client";

import type { ToJson } from "@liveblocks/client";
import { shallow } from "@liveblocks/react";
import {
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useOthersMapped,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  addMoney,
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
import {
  BUILDINGS,
  CARGO,
  CHEAT_MONEY,
  COMPANIES,
  TRACK,
} from "@/game/constants";
import {
  cargoBetween,
  companyBalance,
  formatMoney,
  getStationInfo,
} from "@/game/economy";
import { dueAt } from "@/game/motion";
import { buildNetwork, type Network } from "@/game/network";
import {
  type Built,
  growWorld,
  townGrowth,
  townPlans,
  townStations,
  townStats,
} from "@/game/towns";
import type { ActionResult, Tool, TrackKind } from "@/game/types";
import { generateWorld, INDUSTRY, WATER, type World } from "@/game/world";
import { useMoneyFloaters } from "@/hooks/use-money-floaters";
import { CompanyPicker } from "./company-picker";
import { CompaniesWindow, VehiclesWindow } from "./company-windows";
import { type DragPlan, type LineTool, MapCanvas } from "./map-canvas";
import { StationWindow } from "./station-window";
import { type OpenWindows, Taskbar } from "./taskbar";
import { Toolbar, TOOLS } from "./toolbar";
import { TownWindow } from "./town-window";

type Toast = {
  id: number;
  text: string;
  // News comes with the color of the company it's about. Errors have none.
  color: string | null;
};

// Vehicles are normally run by the player in charge of their company. If
// nobody is (or their tab is asleep), the player who has been in the room
// the longest steps in once a vehicle is this late.
const OVERDUE_MS = 3000;
const TICK_MS = 250;

const TOWN_NEWS_COLOR = "#737373";

const NO_COMPANY: ActionResult = {
  ok: false,
  message: "Choose a company first",
};

export function Game() {
  const seed = useStorage((root) => root.seed);
  const roads = useStorage((root) => root.roads);
  const rails = useStorage((root) => root.rails);
  const demolished = useStorage((root) => root.demolished);
  const stations = useStorageMap((root) => root.stations);
  const vehicles = useStorageMap((root) => root.vehicles);
  const companies = useStorageMap((root) => root.companies);

  // The map isn't synced: every player generates the same one from the seed.
  // Its towns then grow with time, around whatever players have built.
  const generated = useMemo(() => generateWorld(seed), [seed]);
  const stationKeys = [...stations.keys()].join();
  const railStationKeys = [...stations]
    .flatMap(([key, station]) => (station.kind === "rail" ? [key] : []))
    .join();
  const stationTiles = useMemo(() => toTiles(stationKeys), [stationKeys]);
  const built = useMemo<Built>(
    () => ({
      tracks: new Set([...Object.keys(roads), ...Object.keys(rails)].map(Number)),
      railStations: new Set(toTiles(railStationKeys)),
      demolished: new Set(Object.keys(demolished).map(Number)),
    }),
    [roads, rails, railStationKeys, demolished]
  );
  const townSteps = useTownSteps(generated, stationTiles);
  const world = useMemo(
    () => growWorld(generated, townSteps, built),
    [generated, townSteps, built]
  );
  const network = useMemo(
    () => buildNetwork(world, Object.keys(roads), Object.keys(rails)),
    [world, roads, rails]
  );

  const { toasts, notify } = useToasts();
  const { floatMoney, moneyFloaters } = useMoneyFloaters();
  const { myCompany, managers, pickCompany, leaveCompany } =
    useMyCompany(notify);

  const company = myCompany !== null ? companies.get(myCompany) : undefined;
  const balance = companyBalance(company, vehicles.values(), myCompany ?? "");

  const [tool, setTool] = useState<Tool>("select");
  const [hover, setHover] = useState<number | null>(null);
  const [dragPlan, setDragPlan] = useState<DragPlan>(null);
  const [routeFrom, setRouteFrom] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [selectedTown, setSelectedTown] = useState<number | null>(null);
  const [highlightedVehicle, setHighlightedVehicle] = useState<string | null>(
    null
  );
  // On small screens the map comes first: windows start closed
  const [open, setOpen] = useState<OpenWindows>(() => {
    const roomy = window.innerWidth >= 900;
    return { companies: roomy, vehicles: roomy };
  });

  useSimulation(world, network);
  useTownNews(world, notify);

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
    setSelectedTown(null);
    setHover(null);
  }, [seed]);

  // Nothing can be built without a company
  useEffect(() => {
    if (myCompany === null) {
      selectTool("select");
    }
  }, [myCompany, selectTool]);

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

  // Every action ends up here: failures are explained, and money that was
  // spent (or refunded) floats up from the cursor
  const settle = (result: ActionResult) => {
    if (!result.ok) {
      notify(result.message, null);
    } else if (result.cost !== 0) {
      floatMoney(-result.cost);
    }
    return result;
  };

  const buildLine = useMutation(
    ({ storage, self }, lineTool: LineTool, tiles: number[]) => {
      const { company: id } = self.presence;
      if (id === null) {
        return NO_COMPANY;
      }
      return lineTool === "bulldoze"
        ? bulldoze(storage, world, id, tiles, Date.now())
        : buildTrack(storage, world, id, lineTool, tiles);
    },
    [world]
  );

  const placeStation = useMutation(
    ({ storage, self }, kind: TrackKind, tile: number) => {
      const { company: id } = self.presence;
      return id === null
        ? NO_COMPANY
        : buildStation(storage, world, id, kind, tile, Date.now());
    },
    [world]
  );

  const buy = useMutation(
    ({ storage, self }, from: number, to: number) => {
      const { company: id } = self.presence;
      return id === null
        ? NO_COMPANY
        : buyVehicle(storage, world, network, id, from, to, Date.now());
    },
    [world, network]
  );

  const clone = useMutation(
    ({ storage, self }, vehicleId: string) => {
      const { company: id } = self.presence;
      return id === null
        ? NO_COMPANY
        : cloneVehicle(storage, world, network, id, vehicleId, Date.now());
    },
    [world, network]
  );

  const sell = useMutation(({ storage, self }, vehicleId: string) => {
    const { company: id } = self.presence;
    return id === null ? NO_COMPANY : sellVehicle(storage, id, vehicleId);
  }, []);

  const reset = useMutation(
    ({ storage }) =>
      resetGame(storage, Math.floor(Math.random() * 2 ** 31), Date.now()),
    []
  );

  // A hidden cheat: Ctrl + Alt + M adds money to your company
  const cheat = useMutation(({ storage, self }) => {
    const { company: id } = self.presence;
    return id !== null && addMoney(storage, id, CHEAT_MONEY);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.code === "KeyM") {
        event.preventDefault();
        if (cheat()) {
          floatMoney(CHEAT_MONEY);
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === "Escape") {
        selectTool("select");
        setSelectedStation(null);
        return;
      }
      const match = TOOLS.find((each) => each.shortcut === event.key);
      if (match && myCompany !== null) {
        selectTool(match.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectTool, cheat, floatMoney, myCompany]);

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
      const result = settle(placeStation(kind, tile));
      if (result.ok && company) {
        announce(`${company.name} opened ${result.message}`);
      }
    } else if (tool === "vehicle") {
      if (!station || station.owner !== myCompany) {
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
        const result = settle(buy(routeFrom, tile));
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
    const result = settle(clone(vehicleId));
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

  const hint =
    myCompany === null
      ? "Choose a company to start building. You can look around the map in the meantime."
      : describe({
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
      {/* The map fills the screen. Everything else floats over it. */}
      <div className="relative isolate h-dvh overflow-hidden bg-[#4b90d2]">
        <MapCanvas
          world={world}
          network={network}
          stations={stations}
          vehicles={vehicles}
          companies={companies}
          myCompany={myCompany}
          balance={balance}
          tool={tool}
          routeFrom={routeFrom}
          selectedStation={selectedStation}
          highlightedVehicle={highlightedVehicle}
          onHover={setHover}
          onDragPlan={setDragPlan}
          onLine={(lineTool, tiles) => settle(buildLine(lineTool, tiles))}
          onTileClick={onTileClick}
          onTownClick={setSelectedTown}
        />

        <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-2">
          {myCompany !== null ? (
            <Toolbar tool={tool} onSelect={selectTool} />
          ) : null}
          {selectedStation !== null && selected ? (
            <StationWindow
              key={selectedStation}
              world={world}
              tile={selectedStation}
              station={selected}
              owner={companies.get(selected.owner)}
              vehicles={vehicles}
              mine={selected.owner === myCompany}
              onStartRoute={() => onStartRoute(selectedStation)}
              onClose={() => setSelectedStation(null)}
            />
          ) : null}
          {selectedTown !== null && world.towns[selectedTown] ? (
            <TownWindow
              key={selectedTown}
              world={world}
              town={selectedTown}
              stations={townStations(world, stationTiles)[selectedTown]}
              grown={
                townSteps[selectedTown] >=
                townPlans(generated)[selectedTown].length
              }
              onClose={() => setSelectedTown(null)}
            />
          ) : null}
        </div>

        <div className="pointer-events-none absolute top-2 right-2 flex flex-col items-end gap-2">
          {open.companies ? (
            <CompaniesWindow
              myCompany={myCompany}
              vehicles={vehicles}
              companies={companies}
              managers={managers}
              onReset={onReset}
              onClose={() => setOpen({ ...open, companies: false })}
            />
          ) : null}
          {open.vehicles && myCompany !== null ? (
            <VehiclesWindow
              world={world}
              myCompany={myCompany}
              stations={stations}
              vehicles={vehicles}
              onHighlight={setHighlightedVehicle}
              onClone={onClone}
              onSell={(vehicleId) => settle(sell(vehicleId))}
              onClose={() => setOpen({ ...open, vehicles: false })}
            />
          ) : null}
        </div>

        {myCompany === null ? (
          <CompanyPicker
            companies={companies}
            vehicles={vehicles}
            managers={managers}
            onPick={pickCompany}
          />
        ) : null}

        <div className="pointer-events-none absolute bottom-12 left-2 flex flex-col items-start gap-1">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="win flex animate-in items-center gap-1.5 px-2 py-1 fade-in slide-in-from-bottom-1"
            >
              <span
                className="size-2.5 shrink-0 border border-black"
                style={{ background: toast.color ?? "#c00000" }}
              />
              {toast.text}
            </div>
          ))}
        </div>

        <Taskbar
          hint={hint}
          company={company}
          balance={balance}
          open={open}
          onToggle={(name) => setOpen({ ...open, [name]: !open[name] })}
          onSwitchCompany={leaveCompany}
        />

        {moneyFloaters}
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

function toTiles(keys: string) {
  return keys === "" ? [] : keys.split(",").map(Number);
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

// Which company this player runs is kept in Presence, so a company is taken
// for exactly as long as the player running it is connected.
function useMyCompany(notify: (text: string, color: string | null) => void) {
  const myCompany = useSelf((me) => me.presence.company);
  const connectionId = useSelf((me) => me.connectionId);
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthersMapped(
    (other) => ({
      company: other.presence.company,
      name: other.info.name.split(" ")[0],
    }),
    shallow
  );

  // Company id → name of the other player running it
  const managers = useMemo(() => {
    const result = new Map<string, string>();
    for (const [, { company, name }] of others) {
      if (company !== null && !result.has(company)) {
        result.set(company, name);
      }
    }
    return result;
  }, [others]);

  // Two players can pick the same company at the same moment. The one who
  // joined the room first keeps it, and the other chooses again.
  useEffect(() => {
    const rival = others.find(
      ([id, { company }]) => company === myCompany && id < connectionId
    );
    if (myCompany !== null && rival) {
      const name = COMPANIES.find((each) => each.id === myCompany)?.name;
      updateMyPresence({ company: null });
      notify(`${rival[1].name} took ${name ?? "that company"} first`, null);
    }
  }, [others, myCompany, connectionId, updateMyPresence, notify]);

  // Founds the company the first time someone picks it (or after a new map)
  const exists = useStorage(
    (root) => myCompany !== null && myCompany in root.companies
  );
  const found = useMutation(({ storage, self }) => {
    if (self.presence.company !== null) {
      ensureCompany(storage, self.presence.company, Date.now());
    }
  }, []);
  useEffect(() => {
    if (myCompany !== null && !exists) {
      found();
    }
  }, [myCompany, exists, found]);

  const pickCompany = useCallback(
    (company: string) => updateMyPresence({ company }),
    [updateMyPresence]
  );
  const leaveCompany = useCallback(
    () => updateMyPresence({ company: null }),
    [updateMyPresence]
  );

  return { myCompany, managers, pickCompany, leaveCompany };
}

// How many steps each town has grown by now. Nobody stores this: it follows
// from the clock, from the stations around the town, and from the growth
// saved in Storage the last time one of those stations was built or removed.
// `world` is the world as generated, before any growth.
function useTownSteps(world: World, stationTiles: readonly number[]) {
  const saved = useStorage((root) => root.towns);
  const startedAt = useStorage((root) => root.startedAt);

  const measure = useCallback(() => {
    const stations = townStations(world, stationTiles);
    const plans = townPlans(world);
    return world.towns.map(({ id }) =>
      Math.min(
        plans[id].length,
        Math.floor(townGrowth(saved[id], stations[id], startedAt, Date.now()))
      )
    );
  }, [world, stationTiles, saved, startedAt]);

  const [steps, setSteps] = useState(measure);
  useEffect(() => {
    // Towns only change when one of them reaches its next step
    const update = () =>
      setSteps((current) => {
        const next = measure();
        return next.join() === current.join() ? current : next;
      });
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [measure]);

  return steps;
}

// Tells the player when a town they are watching grow gets its first tower
// or skyscraper. Every client notices on its own, so nothing is broadcast.
function useTownNews(
  world: World,
  notify: (text: string, color: string | null) => void
) {
  const seen = useRef<{ seed: number; tallest: number[] } | null>(null);
  useEffect(() => {
    const tallest = townStats(world).map((town) => town.tallest);
    const before = seen.current;
    seen.current = { seed: world.seed, tallest };
    if (before?.seed !== world.seed) {
      return;
    }
    for (const town of world.towns) {
      if (tallest[town.id] > before.tallest[town.id] && tallest[town.id] >= 3) {
        const building = BUILDINGS[tallest[town.id]].label.toLowerCase();
        notify(`${town.name} has its first ${building}`, TOWN_NEWS_COLOR);
      }
    }
  }, [world, notify]);
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
    const managed = new Set(others.map((other) => other.presence.company));
    const isHost = others.every(
      (other) => other.connectionId > self.connectionId
    );

    runSimulation(
      storage,
      latest.current.world,
      latest.current.network,
      now,
      (vehicle) =>
        vehicle.owner === self.presence.company ||
        (isHost &&
          (!managed.has(vehicle.owner) || dueAt(vehicle) < now - OVERDUE_MS))
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
    if (dragPlan) {
      const tiles = `${dragPlan.tiles} ${dragPlan.tiles === 1 ? "tile" : "tiles"}`;
      return (
        dragPlan.problem ??
        (dragPlan.cost > 0
          ? `Clear ${tiles} · Demolishing buildings costs ${formatMoney(dragPlan.cost)}`
          : `Clear ${tiles}`)
      );
    }
    return `Clear · Click or drag over your tracks and stations to remove them, or over buildings to demolish them, from ${formatMoney(BUILDINGS[0].demolishCost)} for a cottage`;
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
    return "Drag to move around · Scroll to zoom · Click a station or a town's name to inspect it";
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
    const house = world.houses[world.houseAt[hover]];
    return `${world.towns[house.town].name} · ${BUILDINGS[house.variant].label} · Supplies and accepts passengers`;
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
