"use client";

import type { ToJson } from "@liveblocks/client";
import { shallow } from "@liveblocks/react";
import {
  useBroadcastEvent,
  useCanRedo,
  useCanUndo,
  useEventListener,
  useMutation,
  useOthersMapped,
  useRedo,
  useRoom,
  useSelf,
  useStorage,
  useUndo,
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
  clockOf,
  recordStats,
  resetGame,
  runSimulation,
  sellVehicle,
  setSpeed,
  snapshotView,
  stationCost,
  stationProblem,
  syncTownGrowth,
  timeOf,
} from "@/game/actions";
import { type MapOptions, mapOptions } from "@/game/climate";
import { type Clock, gameTime, type Speed, speedOf } from "@/game/clock";
import {
  BUILDINGS,
  CARGO,
  CHEAT_MONEY,
  COMPANIES,
  DEFAULT_MAP_SIZE,
  MAP_SIZES,
  STADIUM,
  STREET_REMOVAL_COST,
  TRACK,
  TRANSPORT,
} from "@/game/constants";
import {
  cargoBetween,
  companyBalance,
  formatMoney,
  getStationInfo,
  nothingToCarry,
} from "@/game/economy";
import { dueAt } from "@/game/motion";
import { buildNetwork, type Network } from "@/game/network";
import {
  type Built,
  growWorld,
  servedStations,
  townPlan,
  townStations,
  townSteps as townStepsAt,
  townStats,
} from "@/game/towns";
import type { ActionResult, Tool, Transport } from "@/game/types";
import {
  generateWorld,
  type Industry,
  INDUSTRY,
  WATER,
  type World,
} from "@/game/world";
import type { MapView } from "@/game/render/renderer";
import { useMoneyFloaters } from "@/hooks/use-money-floaters";
import { useIsMac } from "@/hooks/use-is-mac";
import { useTheme } from "@/hooks/use-theme";
import { useUiTheme } from "@/hooks/use-ui-theme";
import { useClock } from "@/hooks/use-now";
import { CompanyPicker } from "./company-picker";
import { CompaniesWindow, VehiclesWindow } from "./company-windows";
import { CargoWindow, IndustryWindow } from "./industry-windows";
import { NewMapWindow } from "./new-map-window";
import {
  type DragPlan,
  type Focus,
  type LineTool,
  MapCanvas,
} from "./map-canvas";
import { StationWindow } from "./station-window";
import { StatsWindow } from "./stats-window";
import { ThemeWindow } from "./theme-window";
import { type OpenWindows, Taskbar } from "./taskbar";
import { type History, Toolbar, TOOLS } from "./toolbar";
import { TownWindow } from "./town-window";
import { VehicleWindow } from "./vehicle-window";

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
// How often to check whether it is time to write down the statistics
const STATS_TICK_MS = 2000;

const TOWN_NEWS_COLOR = "#737373";

// The tools that place a station, and the kind of station they place
const STATION_TOOLS: { [tool in Tool]?: Transport } = {
  "road-station": "road",
  "rail-station": "rail",
  "water-station": "water",
};

const NO_COMPANY: ActionResult = {
  ok: false,
  message: "Choose a company first",
};

export function Game() {
  const seed = useStorage((root) => root.seed);
  const storedSize = useStorage((root) => root.size);
  // Whatever ends up in Storage, only play on a map size the game knows
  const size = MAP_SIZES.some((option) => option.size === storedSize)
    ? storedSize
    : DEFAULT_MAP_SIZE;
  const climate = useStorage((root) => root.climate);
  const landscape = useStorage((root) => root.landscape);
  const map = useMemo(
    () => mapOptions({ climate, landscape }),
    [climate, landscape]
  );
  const roads = useStorage((root) => root.roads);
  const rails = useStorage((root) => root.rails);
  const canals = useStorage((root) => root.canals);
  const demolished = useStorage((root) => root.demolished);
  const stations = useStorageMap((root) => root.stations);
  const vehicles = useStorageMap((root) => root.vehicles);
  const companies = useStorageMap((root) => root.companies);
  const industries = useStorageMap((root) => root.industries);
  const stats = useStorageMap((root) => root.stats);
  const startedAt = useStorage((root) => root.startedAt);

  // The map isn't synced: every player generates the same one from the seed.
  // Its towns then grow with time, around whatever players have built.
  const generated = useMemo(
    () => generateWorld(seed, size, map),
    [seed, size, map]
  );
  const stationKeys = [...stations.keys()].join();
  // A street can run through a road stop, but not through other stations
  const noStreetKeys = [...stations]
    .flatMap(([key, station]) => (station.kind === "road" ? [] : [key]))
    .join();
  const stationTiles = useMemo(() => toTiles(stationKeys), [stationKeys]);
  const built = useMemo<Built>(
    () => ({
      tracks: new Set(
        [roads, rails, canals]
          .flatMap((layer) => Object.keys(layer))
          .map(Number)
      ),
      canals: new Set(Object.keys(canals).map(Number)),
      noStreets: new Set(toTiles(noStreetKeys)),
      demolished: new Set(Object.keys(demolished).map(Number)),
    }),
    [roads, rails, canals, noStreetKeys, demolished]
  );
  const isMac = useIsMac();
  const clock = useClock();
  const [theme, setTheme] = useTheme();
  const [uiTheme, setUiTheme] = useUiTheme();
  const speed = speedOf(clock);
  // Towns only grow around stations that vehicles are running to
  const servedKeys = servedStations(vehicles.values()).join();
  const servedTiles = useMemo(() => toTiles(servedKeys), [servedKeys]);
  const townSteps = useTownSteps(generated, servedTiles, clock);
  const world = useMemo(
    () => growWorld(generated, townSteps, built),
    [generated, townSteps, built]
  );
  const network = useMemo(
    () =>
      buildNetwork(
        world,
        Object.keys(roads),
        Object.keys(rails),
        Object.keys(canals)
      ),
    [world, roads, rails, canals]
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
  const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
  const [choosingMap, setChoosingMap] = useState(false);
  // Buildings are see-through, for this player only
  const [xray, setXray] = useState(false);
  // Where the map was last asked to go, e.g. to an industry picked in a list
  const [focus, setFocus] = useState<Focus>(null);
  const [highlightedVehicle, setHighlightedVehicle] = useState<string | null>(
    null
  );
  // The vehicle whose window is open, and whether the map follows it around
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const mapView = useRef<MapView | null>(null);
  // On small screens the map comes first: windows start closed
  const [open, setOpen] = useState<OpenWindows>(() => {
    const roomy = window.innerWidth >= 900;
    return {
      companies: roomy,
      vehicles: roomy,
      cargo: false,
      stats: false,
      theme: false,
    };
  });

  useSimulation(world, network);
  useStatsRecorder(world);
  useTownNews(world, notify);
  const history = useHistory(seed, myCompany, balance, floatMoney);

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
    setSelectedIndustry(null);
    setHover(null);
    setChoosingMap(false);
  }, [seed, size]);

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
        ? bulldoze(storage, world, id, tiles)
        : buildTrack(storage, world, id, lineTool, tiles);
    },
    [world]
  );

  const placeStation = useMutation(
    ({ storage, self }, kind: Transport, tile: number) => {
      const { company: id } = self.presence;
      return id === null
        ? NO_COMPANY
        : buildStation(
            storage,
            world,
            id,
            kind,
            tile,
            timeOf(storage, Date.now())
          );
    },
    [world]
  );

  const buy = useMutation(
    ({ storage, self }, from: number, to: number) => {
      const { company: id } = self.presence;
      return id === null
        ? NO_COMPANY
        : buyVehicle(
            storage,
            world,
            network,
            id,
            from,
            to,
            timeOf(storage, Date.now())
          );
    },
    [world, network]
  );

  const clone = useMutation(
    ({ storage, self }, vehicleId: string) => {
      const { company: id } = self.presence;
      return id === null
        ? NO_COMPANY
        : cloneVehicle(
            storage,
            world,
            network,
            id,
            vehicleId,
            timeOf(storage, Date.now())
          );
    },
    [world, network]
  );

  const sell = useMutation(({ storage, self }, vehicleId: string) => {
    const { company: id } = self.presence;
    return id === null ? NO_COMPANY : sellVehicle(storage, id, vehicleId);
  }, []);

  const room = useRoom();
  const resetStorage = useMutation(
    ({ storage }, newSize: number, options: MapOptions) =>
      resetGame(
        storage,
        Math.floor(Math.random() * 2 ** 31),
        newSize,
        options,
        Date.now()
      ),
    []
  );
  // A new map is the one thing that can't be undone
  const reset = (newSize: number, options: MapOptions) =>
    room.history.disable(() => resetStorage(newSize, options));

  // The game runs at the same speed for everyone, so that isn't one
  // player's to undo
  const storeSpeed = useMutation(
    ({ storage }, next: Speed) => setSpeed(storage, next, Date.now()),
    []
  );
  const changeSpeed = (next: Speed) => {
    if (next === speed) {
      return;
    }
    room.history.disable(() => storeSpeed(next));
    const did =
      next === "paused"
        ? "paused the game"
        : next === "fast"
          ? "is fast-forwarding the game"
          : speed === "paused"
            ? "resumed the game"
            : "set the game back to normal speed";
    announce(`${company?.name ?? "Someone"} ${did}`);
  };
  // The keys switch a speed on, and off again
  const toggleSpeed = (toggled: Speed) =>
    changeSpeed(speed === toggled ? "play" : toggled);

  // A hidden cheat: Ctrl + Alt + M adds money to your company
  const cheat = useMutation(({ storage, self }) => {
    const { company: id } = self.presence;
    return id !== null && addMoney(storage, id, CHEAT_MONEY);
  }, []);

  const latestToggleSpeed = useRef(toggleSpeed);
  useEffect(() => {
    latestToggleSpeed.current = toggleSpeed;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.code === "KeyM") {
        event.preventDefault();
        if (cheat()) {
          floatMoney(CHEAT_MONEY);
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "z" || key === "y") {
          event.preventDefault();
          if (key === "y" || event.shiftKey) {
            history.redo();
          } else {
            history.undo();
          }
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
      const letter = event.key.toLowerCase();
      if ((letter === "p" || letter === "f") && myCompany !== null) {
        latestToggleSpeed.current(letter === "p" ? "paused" : "fast");
        return;
      }
      if (letter === "x") {
        setXray((on) => !on);
        return;
      }
      const match = TOOLS.find((each) => each.shortcut === event.key);
      if (match && myCompany !== null) {
        selectTool(match.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectTool, cheat, floatMoney, myCompany, history]);

  // So can a vehicle whose window is open, e.g. when it is sold
  const watched =
    selectedVehicle !== null ? vehicles.get(selectedVehicle) : undefined;
  useEffect(() => {
    if (selectedVehicle !== null && !watched) {
      setSelectedVehicle(null);
      setFollowing(false);
    }
  }, [selectedVehicle, watched]);
  const showVehicle = (vehicleId: string) => {
    if (vehicleId !== selectedVehicle) {
      setFollowing(false);
    }
    setSelectedVehicle(vehicleId);
  };

  // The station a route starts from can disappear, e.g. when it is undone
  useEffect(() => {
    if (routeFrom !== null && !stations.has(String(routeFrom))) {
      setRouteFrom(null);
    }
  }, [routeFrom, stations]);

  const describeVehicle = (kind: Transport, from: number, to: number) => {
    if (kind === "rail") {
      return "a train";
    }
    const passengers = [
      ...cargoBetween(world, from, to),
      ...cargoBetween(world, to, from),
    ].includes("passengers");
    if (kind === "water") {
      return passengers ? "a ferry" : "a ship";
    }
    return passengers ? "a bus" : "a truck";
  };

  const onTileClick = (tile: number) => {
    const station = stations.get(String(tile));
    const stationKind = STATION_TOOLS[tool];

    if (tool === "select") {
      setSelectedStation(station ? tile : null);
      if (!station && world.industryAt[tile] >= 0) {
        setSelectedIndustry(world.industryAt[tile]);
      } else if (!station && world.houseAt[tile] >= 0) {
        setSelectedTown(world.houses[world.houseAt[tile]].town);
      }
    } else if (stationKind) {
      const result = settle(placeStation(stationKind, tile));
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

  const onNewMap = (newSize: number, options: MapOptions) => {
    setChoosingMap(false);
    reset(newSize, options);
    announce(`${company?.name ?? "Someone"} started a new map`);
  };

  // Opens an industry's or a town's window and brings it into view
  const showIndustry = (industry: Industry) => {
    setSelectedIndustry(industry.id);
    setFocus({ x: industry.x + 1, y: industry.y + 1 });
  };
  const showTown = (id: number) => {
    const town = world.towns[id];
    setSelectedTown(id);
    setFocus({ x: town.x + 0.5, y: town.y + 0.5 });
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
          flipKey: isMac ? "Option (⌥)" : "Alt",
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
          highlightedVehicle={highlightedVehicle ?? selectedVehicle}
          follow={following ? selectedVehicle : null}
          clock={clock}
          theme={theme}
          xray={xray}
          focus={focus}
          view={mapView}
          onHover={setHover}
          onDragPlan={setDragPlan}
          onLine={(lineTool, tiles) => settle(buildLine(lineTool, tiles))}
          onTileClick={onTileClick}
          onTownClick={setSelectedTown}
          onVehicleClick={showVehicle}
          onStopFollow={() => setFollowing(false)}
        />

        <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-2">
          {myCompany !== null ? (
            <Toolbar
              tool={tool}
              history={history}
              speed={speed}
              xray={xray}
              onSelect={selectTool}
              onSpeed={changeSpeed}
              onXray={setXray}
            />
          ) : null}
          {selectedStation !== null && selected ? (
            <StationWindow
              key={selectedStation}
              world={world}
              tile={selectedStation}
              station={selected}
              owner={companies.get(selected.owner)}
              vehicles={vehicles}
              industries={industries}
              startedAt={startedAt}
              mine={selected.owner === myCompany}
              onStartRoute={() => onStartRoute(selectedStation)}
              onClose={() => setSelectedStation(null)}
            />
          ) : null}
          {selectedVehicle !== null && watched ? (
            <VehicleWindow
              key={selectedVehicle}
              world={world}
              vehicleId={selectedVehicle}
              vehicle={watched}
              stations={stations}
              owner={companies.get(watched.owner)}
              mine={watched.owner === myCompany}
              following={following}
              view={mapView}
              onFollow={setFollowing}
              onClone={() => onClone(selectedVehicle)}
              onSell={() => settle(sell(selectedVehicle))}
              onClose={() => {
                setSelectedVehicle(null);
                setFollowing(false);
              }}
            />
          ) : null}
          {selectedTown !== null && world.towns[selectedTown] ? (
            <TownWindow
              key={selectedTown}
              world={world}
              town={selectedTown}
              stations={townStations(world, servedTiles)[selectedTown]}
              progress={
                townSteps[selectedTown] > 0
                  ? townSteps[selectedTown] /
                    townPlan(generated, selectedTown).length
                  : 0
              }
              onClose={() => setSelectedTown(null)}
            />
          ) : null}
          {selectedIndustry !== null && world.industries[selectedIndustry] ? (
            <IndustryWindow
              key={selectedIndustry}
              world={world}
              industry={world.industries[selectedIndustry]}
              saved={industries.get(String(selectedIndustry))}
              startedAt={startedAt}
              stations={stations}
              companies={companies}
              onShowIndustry={showIndustry}
              onClose={() => setSelectedIndustry(null)}
            />
          ) : null}
        </div>

        {speed !== "play" ? (
          <div className="win pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 font-bold">
            {speed === "paused" ? "Game paused" : "Fast forward"}
          </div>
        ) : null}

        <div className="pointer-events-none absolute top-2 right-2 flex flex-col items-end gap-2">
          {open.companies ? (
            <CompaniesWindow
              myCompany={myCompany}
              vehicles={vehicles}
              companies={companies}
              managers={managers}
              onReset={() => setChoosingMap(true)}
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
              onSelect={showVehicle}
              onClone={onClone}
              onSell={(vehicleId) => settle(sell(vehicleId))}
              onClose={() => setOpen({ ...open, vehicles: false })}
            />
          ) : null}
          {open.theme ? (
            <ThemeWindow
              theme={theme}
              uiTheme={uiTheme}
              onPick={setTheme}
              onPickUi={setUiTheme}
              onClose={() => setOpen({ ...open, theme: false })}
            />
          ) : null}
          {open.stats ? (
            <StatsWindow
              stats={stats}
              companies={companies}
              onClose={() => setOpen({ ...open, stats: false })}
            />
          ) : null}
          {open.cargo ? (
            <CargoWindow
              world={world}
              onShowIndustry={showIndustry}
              onShowTown={showTown}
              onClose={() => setOpen({ ...open, cargo: false })}
            />
          ) : null}
        </div>

        {choosingMap ? (
          <NewMapWindow
            size={size}
            map={map}
            onStart={onNewMap}
            onClose={() => setChoosingMap(false)}
          />
        ) : null}

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
                className="size-2.5 shrink-0 border border-ui-edge"
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

// Undo and redo come with Liveblocks: every `useMutation` call a player
// makes is one step that can be taken back, without touching what others
// have built. Money is part of Storage too, so it comes back as well.
function useHistory(
  seed: number,
  myCompany: string | null,
  balance: number,
  floatMoney: (amount: number) => void
): History {
  const room = useRoom();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // What was built for another company, or on a previous map, isn't this
  // player's to take back anymore
  useEffect(() => {
    room.history.clear();
  }, [room, seed, myCompany]);

  // Let the money that an undo or redo gives or takes float up like any
  // other money, by comparing the balance right before and right after
  const latest = useRef(balance);
  const before = useRef<{ balance: number; at: number } | null>(null);
  useEffect(() => {
    latest.current = balance;
    const pending = before.current;
    if (pending && balance !== pending.balance) {
      before.current = null;
      if (Date.now() - pending.at < 500) {
        floatMoney(balance - pending.balance);
      }
    }
  }, [balance, floatMoney]);

  return useMemo(() => {
    const track = (step: () => void) => () => {
      before.current = { balance: latest.current, at: Date.now() };
      step();
    };
    return { canUndo, canRedo, undo: track(undo), redo: track(redo) };
  }, [canUndo, canRedo, undo, redo]);
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
  const room = useRoom();
  const found = useMutation(({ storage, self }) => {
    if (self.presence.company !== null) {
      ensureCompany(
        storage,
        self.presence.company,
        timeOf(storage, Date.now())
      );
    }
  }, []);
  useEffect(() => {
    if (myCompany !== null && !exists) {
      // Not something the player did, so not something to undo
      room.history.disable(found);
    }
  }, [room, myCompany, exists, found]);

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
// from the clock, from the stations in the town that vehicles call at, and
// from the growth saved in Storage the last time that number changed.
// `world` is the world as generated, before any growth.
function useTownSteps(
  world: World,
  servedTiles: readonly number[],
  clock: Clock
) {
  const saved = useStorage((root) => root.towns);

  const measure = useCallback(() => {
    const now = gameTime(clock, Date.now());
    return world.towns.map(({ id }) =>
      Math.floor(townStepsAt(world, id, saved[id], now))
    );
  }, [world, saved, clock]);

  // Towns grow at the speed saved in Storage. When the number of stations
  // that vehicles call at changes for one, save how far it got, and its new
  // speed.
  const room = useRoom();
  const sync = useMutation(
    ({ storage }) =>
      syncTownGrowth(storage, world, timeOf(storage, Date.now())),
    [world]
  );
  useEffect(() => {
    const stations = townStations(world, servedTiles);
    if (
      world.towns.some(({ id }) => (saved[id]?.stations ?? 0) !== stations[id])
    ) {
      room.history.disable(sync);
    }
  }, [room, world, servedTiles, saved, sync]);

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
// or skyscraper, or a stadium. Every client notices on its own, so nothing
// is broadcast.
function useTownNews(
  world: World,
  notify: (text: string, color: string | null) => void
) {
  const seen = useRef<{
    seed: number;
    tallest: number[];
    stadiums: number[];
  } | null>(null);
  useEffect(() => {
    const stats = townStats(world);
    const tallest = stats.map((town) => town.tallest);
    const stadiums = stats.map((town) => town.counts[STADIUM]);
    const before = seen.current;
    seen.current = { seed: world.seed, tallest, stadiums };
    if (before?.seed !== world.seed) {
      return;
    }
    for (const town of world.towns) {
      if (tallest[town.id] > before.tallest[town.id] && tallest[town.id] >= 3) {
        const building = BUILDINGS[tallest[town.id]].label.toLowerCase();
        notify(`${town.name} has its first ${building}`, TOWN_NEWS_COLOR);
      }
      if (stadiums[town.id] > before.stadiums[town.id]) {
        notify(`${town.name} has a new stadium`, TOWN_NEWS_COLOR);
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
    // Nothing arrives anywhere while the game is paused
    const clock = clockOf(storage);
    if (clock.speed === 0) {
      return;
    }
    const now = gameTime(clock, Date.now());
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
          (!managed.has(vehicle.owner) ||
            dueAt(vehicle) < now - OVERDUE_MS * clock.speed))
    );
  }, []);

  // Vehicles move on their own: none of this ends up in a player's undo
  // history
  const room = useRoom();
  useEffect(() => {
    const interval = window.setInterval(
      () => room.history.disable(tick),
      TICK_MS
    );
    return () => window.clearInterval(interval);
  }, [room, tick]);
}

// How every company is doing is written to Storage every few seconds, for
// the graphs in the statistics window. One client does it, the one that has
// been in the room the longest. The others step in if it doesn't.
function useStatsRecorder(world: World) {
  const latest = useRef(world);
  useEffect(() => {
    latest.current = world;
  });

  const record = useMutation(({ storage, self, others }) => {
    if (clockOf(storage).speed === 0) {
      return;
    }
    const isHost = others.every(
      (other) => other.connectionId > self.connectionId
    );
    recordStats(storage, latest.current, timeOf(storage, Date.now()), isHost);
  }, []);

  const room = useRoom();
  useEffect(() => {
    const interval = window.setInterval(
      () => room.history.disable(record),
      STATS_TICK_MS
    );
    return () => window.clearInterval(interval);
  }, [room, record]);
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
  flipKey,
}: {
  world: World;
  network: Network;
  stations: ReadonlyMap<
    string,
    { owner: string; kind: Transport; name: string }
  >;
  companies: ReadonlyMap<string, { name: string }>;
  tool: Tool;
  hover: number | null;
  dragPlan: DragPlan;
  routeFrom: number | null;
  balance: number;
  // What the key that flips the corner of a line is called on this device
  flipKey: string;
}) {
  if (tool === "road" || tool === "rail" || tool === "canal") {
    const { label, cost } = TRACK[tool];
    if (dragPlan) {
      return (
        dragPlan.problem ??
        `${label} · ${dragPlan.tiles} ${dragPlan.tiles === 1 ? "tile" : "tiles"} · ${formatMoney(dragPlan.cost)}`
      );
    }
    return tool === "canal"
      ? `${label} · Drag across land to dig a waterway for ships · Hold ${flipKey} to flip the corner · ${formatMoney(cost)} per tile`
      : `${label} · Drag across the map to build · Hold ${flipKey} to flip the corner · ${formatMoney(cost)} per tile`;
  }

  if (tool === "bulldoze") {
    if (dragPlan) {
      const tiles = `${dragPlan.tiles} ${dragPlan.tiles === 1 ? "tile" : "tiles"}`;
      return (
        dragPlan.problem ??
        (dragPlan.cost > 0
          ? `Clear ${tiles} · Removing the town's buildings and streets costs ${formatMoney(dragPlan.cost)}`
          : `Clear ${tiles}`)
      );
    }
    return `Clear · Click or drag over your tracks and stations to remove them, or over a town's streets (${formatMoney(STREET_REMOVAL_COST)} a tile) and buildings (from ${formatMoney(BUILDINGS[0].demolishCost)})`;
  }

  const kind = STATION_TOOLS[tool];
  if (kind) {
    const { stationLabel, stationCost: baseCost } = TRANSPORT[kind];
    if (hover === null) {
      return kind === "water"
        ? `${stationLabel} · Click on the water by the shore, or on a canal, near a town or an industry · ${formatMoney(baseCost)}`
        : `${stationLabel} · Click next to a town or an industry · ${formatMoney(baseCost)}`;
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
    const supplies = info.supply.map((entry) =>
      entry.cargo === "passengers"
        ? `passengers from ${info.population.toLocaleString("en-US")} people`
        : CARGO[entry.cargo].label.toLowerCase()
    );
    const accepts = info.accepts.map((cargo) => CARGO[cargo].label);
    const serves =
      supplies.length + accepts.length === 0
        ? "nothing in range"
        : [
            supplies.length > 0 ? `picks up ${supplies.join(", ")}` : null,
            accepts.length > 0
              ? `accepts ${accepts.join(", ").toLowerCase()}`
              : null,
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
    const to = hover !== null ? stations.get(String(hover)) : undefined;
    const cost = TRANSPORT[from?.kind ?? "road"].vehicleCost;
    if (!from || !to || hover === null || hover === routeFrom) {
      return `Vehicle · Now click the station to go to · ${formatMoney(cost)}`;
    }
    const there = cargoBetween(world, routeFrom, hover);
    const back = cargoBetween(world, hover, routeFrom);
    if (there.length + back.length === 0) {
      return nothingToCarry(
        world,
        { tile: routeFrom, name: from.name },
        { tile: hover, name: to.name }
      );
    }
    const carries = [...new Set([...there, ...back])]
      .map((cargo) => CARGO[cargo].label)
      .join(", ");
    return `Vehicle · ${from.name} ↔ ${to.name} · Carries ${carries} · ${formatMoney(cost)}`;
  }

  if (hover === null) {
    return "Drag to move around · Scroll to zoom · Click a station, a vehicle, an industry or a town to inspect it";
  }

  const station = stations.get(String(hover));
  if (station) {
    return `${station.name} · ${companies.get(station.owner)?.name ?? "Unknown"}`;
  }
  if (world.industryAt[hover] >= 0) {
    const industry = world.industries[world.industryAt[hover]];
    const { produces, accepts } = INDUSTRY[industry.type];
    const what = produces
      ? `Produces ${CARGO[produces].label.toLowerCase()}`
      : `Accepts ${accepts ? CARGO[accepts].label.toLowerCase() : "nothing"}`;
    return `${industry.name} · ${what} · Click to see where it ${produces ? "goes" : "comes from"}`;
  }
  if (world.houseAt[hover] >= 0) {
    const house = world.houses[world.houseAt[hover]];
    return `${world.towns[house.town].name} · ${BUILDINGS[house.variant].label} · Supplies and accepts passengers`;
  }
  if (network.rail[hover]) {
    return "Railway";
  }
  if (network.road[hover]) {
    return world.townRoads[hover]
      ? "Town street · Anyone can drive on it"
      : "Road";
  }
  if (network.canal[hover]) {
    return "Canal · Ships sail on it like on any water, and roads and railways cross it on bridges";
  }
  if (world.terrain[hover] === WATER) {
    return "Water · Ships sail on it from dock to dock, and roads and railways cross it on bridges";
  }
  return world.trees[hover] > 0 ? "Woodland" : "Open land";
}
