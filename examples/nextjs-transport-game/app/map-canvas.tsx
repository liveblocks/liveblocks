"use client";

import { useRoom, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { Minus, Plus } from "lucide-react";
import { PointerEvent, type RefObject, useEffect, useRef } from "react";
import {
  clearingCost,
  snapshotView,
  stationPlan,
  stationProblem,
  trackPlan,
  trackProblem,
} from "@/game/actions";
import { type Clock, gameTime } from "@/game/clock";
import { applyTheme, type Theme } from "@/game/render/theme";
import { COMPANIES, TILE_H, TILE_W } from "@/game/constants";
import {
  distanceToVehicle,
  headDistance,
  isInside,
  type PathPoint,
  vehiclePoint,
} from "@/game/motion";
import { lineBetween, type Network, straightLine } from "@/game/network";
import {
  type Camera,
  type MapView,
  Renderer,
  type Scene,
  type Viewport,
} from "@/game/render/renderer";
import { HALF_W, worldX, worldY } from "@/game/render/shapes";
import type {
  CompanyData,
  LineKind,
  StationData,
  Tool,
  Vehicle,
} from "@/game/types";
import { nearestTown, type World } from "@/game/world";

// The tools that are dragged across the map. A train station is one too:
// its platform is as long as the line that was dragged.
export type LineTool = LineKind | "rail-station" | "bulldoze";

// A spot the map should move to, in tile coordinates. Every new object moves
// the map again, even to the same spot.
export type Focus = { x: number; y: number } | null;

// What the line being dragged would build
export type DragPlan = {
  tiles: number;
  cost: number;
  problem: string | null;
} | null;

type Props = {
  world: World;
  network: Network;
  stations: ReadonlyMap<string, StationData>;
  vehicles: ReadonlyMap<string, Vehicle>;
  companies: ReadonlyMap<string, CompanyData>;
  myCompany: string | null;
  balance: number;
  tool: Tool;
  routeFrom: number | null;
  // Whether the stations of a vehicle that is being bought are being
  // picked: clicks are for stations only
  picking: boolean;
  selectedStation: number | null;
  selectedDepot: number | null;
  highlightedVehicle: string | null;
  // The vehicle that the map keeps in the middle of the screen, if any
  follow: string | null;
  clock: Clock;
  // How the map is drawn
  theme: Theme;
  // Whether buildings are see-through
  xray: boolean;
  focus: Focus;
  // What the map is drawn with, for the cameras in vehicle windows
  view: RefObject<MapView | null>;
  onHover: (tile: number | null) => void;
  onDragPlan: (plan: DragPlan) => void;
  onLine: (tool: LineTool, tiles: number[]) => void;
  onTileClick: (tile: number) => void;
  onTownClick: (town: number) => void;
  onVehicleClick: (vehicleId: string) => void;
  // The player moved the map themselves
  onStopFollow: () => void;
};

type Drag = {
  pointerId: number;
  mode: "pan" | "line" | "click";
  x: number;
  y: number;
  cameraX: number;
  cameraY: number;
  moved: boolean;
  startTile: number;
  lastTile: number;
  tiles: number[];
  // Whether the corner of the line being dragged is on its other side,
  // which it is for as long as Alt (Option) is held
  flipped: boolean;
};

// How far out the map can be zoomed: far enough to see a good part of it,
// whatever its size
const minZoom = (size: number) => Math.min(0.35, 22 / size);
const MAX_ZOOM = 2.5;
// A click this close to a vehicle is a click on it: so many tiles, and at
// least so many pixels on screen, as vehicles are small and don't sit still
const VEHICLE_REACH = 0.75;
const VEHICLE_REACH_PIXELS = 24;
// How far above the ground the middle of a vehicle is drawn, in pixels
const VEHICLE_MIDDLE = 5;
const PAN_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};
const NO_TILES: ReadonlySet<number> = new Set();

function isLineTool(tool: Tool): tool is LineTool {
  return (
    tool === "road" ||
    tool === "rail" ||
    tool === "canal" ||
    tool === "rail-station" ||
    tool === "bulldoze"
  );
}

// Whether a press on the map has turned into dragging the map around
function isPanning(drag: Drag | null) {
  return drag !== null && drag.mode !== "line" && drag.moved;
}

// The map itself. Liveblocks Storage and Presence are copied into a plain
// `scene` object, which a canvas renderer reads on every animation frame.
export function MapCanvas(props: Props) {
  const { world } = props;
  const room = useRoom();
  const updateMyPresence = useUpdateMyPresence();

  const rendererRef = useRef<Renderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<Viewport>({ width: 1, height: 1, dpr: 1 });
  const camera = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<Drag | null>(null);
  const pressedKeys = useRef(new Set<string>());
  const latest = useRef(props);
  const scene = useRef<Scene>({
    network: props.network,
    stations: props.stations,
    vehicles: props.vehicles,
    companies: props.companies,
    myCompany: props.myCompany,
    tool: props.tool,
    hover: null,
    preview: null,
    routeFrom: props.routeFrom,
    selectedStation: props.selectedStation,
    selectedDepot: props.selectedDepot,
    highlightedVehicle: props.highlightedVehicle,
    cursors: [],
    clock: props.clock,
    xray: props.xray,
  });

  useEffect(() => {
    latest.current = props;
    Object.assign(scene.current, {
      network: props.network,
      stations: props.stations,
      vehicles: props.vehicles,
      companies: props.companies,
      myCompany: props.myCompany,
      tool: props.tool,
      routeFrom: props.routeFrom,
      selectedStation: props.selectedStation,
      selectedDepot: props.selectedDepot,
      highlightedVehicle: props.highlightedVehicle,
      clock: props.clock,
      xray: props.xray,
    });
  });

  const clampCamera = () => {
    const { size } = latest.current.world;
    const view = camera.current;
    view.x = Math.max(-size * HALF_W, Math.min(size * HALF_W, view.x));
    view.y = Math.max(0, Math.min(size * TILE_H, view.y));
  };

  const zoomAt = (factor: number, screenX: number, screenY: number) => {
    const view = camera.current;
    const { width, height } = viewport.current;
    const zoom = Math.max(
      minZoom(latest.current.world.size),
      Math.min(MAX_ZOOM, view.zoom * factor)
    );
    // Keep the point under the cursor where it is
    view.x += (screenX - width / 2) * (1 / view.zoom - 1 / zoom);
    view.y += (screenY - height / 2) * (1 / view.zoom - 1 / zoom);
    view.zoom = zoom;
    clampCamera();
  };

  // Rendering loop. The renderer is rebuilt for every new map, and
  // kept when the same map only changes, e.g. when a house is demolished.
  const { theme } = props;
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    const { world } = latest.current;
    const renderer = new Renderer(
      world,
      (width, height) => {
        const offscreen = document.createElement("canvas");
        offscreen.width = width;
        offscreen.height = height;
        return offscreen;
      },
      getComputedStyle(canvas).fontFamily || "sans-serif"
    );
    rendererRef.current = renderer;
    latest.current.view.current = { renderer, scene: scene.current };

    // Start on the town closest to the middle of the map
    const middle = world.size / 2;
    const town = nearestTown(world, middle, middle);
    camera.current = {
      x: worldX(town?.x ?? middle, town?.y ?? middle),
      y: worldY(town?.x ?? middle, town?.y ?? middle),
      zoom: 1,
    };
    scene.current.hover = null;
    scene.current.preview = null;

    const followPoint: PathPoint = { x: 0, y: 0, dx: 1, dy: 0 };
    let frame = 0;
    let previous = performance.now();
    const loop = (time: number) => {
      const elapsed = Math.min(0.05, (time - previous) / 1000);
      previous = time;

      let panX = 0;
      let panY = 0;
      for (const key of pressedKeys.current) {
        panX += PAN_KEYS[key][0];
        panY += PAN_KEYS[key][1];
      }
      const { follow, onStopFollow } = latest.current;
      const followed = follow ? scene.current.vehicles.get(follow) : undefined;
      if (panX !== 0 || panY !== 0) {
        const speed = (900 * elapsed) / camera.current.zoom;
        camera.current.x += panX * speed;
        camera.current.y += panY * speed;
        clampCamera();
        if (follow) {
          onStopFollow();
        }
      } else if (followed && !isPanning(drag.current)) {
        // Ease the map toward the vehicle that is being followed
        vehiclePoint(
          followed,
          latest.current.world.size,
          gameTime(scene.current.clock, Date.now()),
          followPoint
        );
        const ease = Math.min(1, elapsed * 6);
        camera.current.x +=
          (worldX(followPoint.x, followPoint.y) - camera.current.x) * ease;
        camera.current.y +=
          (worldY(followPoint.x, followPoint.y) - camera.current.y) * ease;
      }

      renderer.render(
        ctx,
        viewport.current,
        camera.current,
        scene.current,
        Date.now()
      );
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      rendererRef.current = null;
      latest.current.view.current = null;
    };
  }, [world.seed, world.size, world.climate, world.landscape]);

  useEffect(() => {
    rendererRef.current?.setWorld(world);
  }, [world]);

  const { focus } = props;
  useEffect(() => {
    if (focus) {
      camera.current.x = worldX(focus.x, focus.y);
      camera.current.y = worldY(focus.x, focus.y);
    }
  }, [focus]);

  // Keep the canvas as sharp as the screen it's on
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      viewport.current = {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        dpr,
      };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Other players' cursors go straight from Presence to the renderer,
  // without re-rendering React on every mouse move
  useEffect(() => {
    const update = (others: ReturnType<typeof room.getOthers>) => {
      scene.current.cursors = others.flatMap((other) =>
        other.presence.cursor
          ? [
              {
                x: other.presence.cursor.x,
                y: other.presence.cursor.y,
                name: other.info.name.split(" ")[0],
                // Players who are still choosing a company are gray
                color:
                  COMPANIES.find(
                    (company) => company.id === other.presence.company
                  )?.color ?? "#737373",
              },
            ]
          : []
      );
    };
    update(room.getOthers());
    return room.subscribe("others", update);
  }, [room]);

  // Scroll to zoom, arrow keys or WASD to move around
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(
        Math.exp(-event.deltaY * 0.0015),
        event.clientX - rect.left,
        event.clientY - rect.top
      );
    };
    // Alt flips the corner of a line that is being dragged, right away
    const onAlt = (event: KeyboardEvent) => {
      const current = drag.current;
      if (event.key !== "Alt" || current?.mode !== "line") {
        return;
      }
      // Otherwise the key opens the browser's menu on some systems
      event.preventDefault();
      if (current.flipped !== event.altKey && current.lastTile >= 0) {
        current.flipped = event.altKey;
        updateLine(current, current.lastTile);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      onAlt(event);
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key in PAN_KEYS) {
        pressedKeys.current.add(event.key);
        event.preventDefault();
      }
      if (event.key === "Escape" && drag.current?.mode === "line") {
        drag.current = null;
        scene.current.preview = null;
        latest.current.onDragPlan(null);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      onAlt(event);
      pressedKeys.current.delete(event.key);
    };
    const onBlur = () => pressedKeys.current.clear();

    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Town names can be clicked, but only with the select tool: with any other
  // tool, a click builds on the tile under the name
  const townAt = (event: PointerEvent<HTMLCanvasElement>) => {
    if (latest.current.tool !== "select" || latest.current.picking) {
      return null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      rendererRef.current?.townAt(
        event.clientX - rect.left,
        event.clientY - rect.top
      ) ?? null
    );
  };

  const pointAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Renderer.screenToTile(
      viewport.current,
      camera.current,
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  };

  const tileOf = (point: { x: number; y: number }) => {
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    const { size } = latest.current.world;
    return x >= 0 && y >= 0 && x < size && y < size ? y * size + x : null;
  };

  // The vehicle under a point of the map, if one is on its way there. One
  // that is at a station leaves the click to the station, and one that is
  // still inside its depot to the depot.
  const vehicleAt = (point: { x: number; y: number }) => {
    const { size } = latest.current.world;
    const time = gameTime(scene.current.clock, Date.now());
    const at: PathPoint = { x: 0, y: 0, dx: 1, dy: 0 };
    // Vehicles stand a little above the ground they are on, so what looks
    // like their middle is a bit further up the screen than where they are
    const x = point.x + VEHICLE_MIDDLE / TILE_H;
    const y = point.y + VEHICLE_MIDDLE / TILE_H;
    let nearest: string | null = null;
    let nearestDistance = Math.max(
      VEHICLE_REACH,
      VEHICLE_REACH_PIXELS /
        (camera.current.zoom * Math.hypot(TILE_W, TILE_H) * 0.5)
    );
    for (const [id, vehicle] of scene.current.vehicles) {
      if (
        vehicle.status === "dock" ||
        isInside(vehicle, headDistance(vehicle, time))
      ) {
        continue;
      }
      const distance = distanceToVehicle(vehicle, size, time, x, y, at);
      if (distance < nearestDistance) {
        nearest = id;
        nearestDistance = distance;
      }
    }
    return nearest;
  };

  const setHover = (tile: number | null) => {
    if (scene.current.hover !== tile) {
      scene.current.hover = tile;
      latest.current.onHover(tile);
    }
  };

  // Only reads what is kept up to date in refs, so it can also be called
  // from the keyboard listeners above
  const updateLine = (current: Drag, tile: number) => {
    const { world, tool, network, stations, myCompany, balance, onDragPlan } =
      latest.current;
    if (!isLineTool(tool)) {
      return;
    }
    // A platform is straight
    const tiles =
      tool === "rail-station"
        ? straightLine(world.size, current.startTile, tile)
        : lineBetween(world.size, current.startTile, tile, current.flipped);
    current.tiles = tiles;
    current.lastTile = tile;

    const view = snapshotView(network, stations);
    if (tool === "rail-station") {
      const plan = stationPlan(world, view, "rail", tiles, myCompany);
      const tooExpensive = plan.cost > balance;
      const bad = new Set(
        plan.build.filter(
          (each) => tooExpensive || stationProblem(world, view, "rail", each)
        )
      );
      // Without anything wrong with one tile, it is the line as a whole
      // that can't be a platform
      scene.current.preview = {
        tiles,
        bad: plan.problem && bad.size === 0 ? new Set(tiles) : bad,
        tone: "build",
      };
      onDragPlan({
        tiles: plan.build.length,
        cost: plan.cost,
        problem: plan.problem ?? (tooExpensive ? "Not enough money" : null),
      });
      return;
    }
    if (tool === "bulldoze") {
      const cost = clearingCost(world, view, tiles);
      scene.current.preview = { tiles, bad: NO_TILES, tone: "remove" };
      onDragPlan({
        tiles: tiles.length,
        cost,
        problem: cost > balance ? "Not enough money" : null,
      });
      return;
    }

    const plan = trackPlan(world, view, tool, tiles);
    const tooExpensive = plan.cost > balance;
    const bad = new Set(
      tiles.filter(
        (each) => tooExpensive || trackProblem(world, view, tool, each)
      )
    );
    scene.current.preview = { tiles, bad, tone: "build" };
    onDragPlan({
      tiles: plan.missing.length,
      cost: plan.cost,
      problem: plan.problem ?? (tooExpensive ? "Not enough money" : null),
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const tile = tileOf(pointAt(event));
    const lineTool = isLineTool(latest.current.tool);

    let mode: Drag["mode"] = "click";
    if (event.button !== 0 || (lineTool && tile === null)) {
      mode = "pan";
    } else if (lineTool) {
      mode = "line";
    }

    drag.current = {
      pointerId: event.pointerId,
      mode,
      x: event.clientX,
      y: event.clientY,
      cameraX: camera.current.x,
      cameraY: camera.current.y,
      moved: false,
      startTile: tile ?? 0,
      lastTile: -1,
      tiles: [],
      flipped: event.altKey,
    };
    if (mode === "line" && tile !== null) {
      updateLine(drag.current, tile);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointAt(event);
    const tile = tileOf(point);
    const current = drag.current;
    const dx = event.clientX - (current?.x ?? 0);
    const dy = event.clientY - (current?.y ?? 0);
    if (current?.pointerId === event.pointerId && Math.hypot(dx, dy) > 4) {
      if (!current.moved && current.mode !== "line" && latest.current.follow) {
        latest.current.onStopFollow();
      }
      current.moved = true;
    }

    // While the map is being dragged around, this player's cursor stays
    // where it was for everyone else: the map moves under the pointer, so
    // following it would only make the cursor jitter on their screens
    if (!isPanning(current)) {
      setHover(tile);
      updateMyPresence({
        cursor: tile === null ? null : { x: point.x, y: point.y },
      });
    }

    if (!current) {
      event.currentTarget.style.cursor =
        townAt(event) !== null ? "pointer" : "";
    }
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }

    if (current.mode === "line") {
      const flipped = event.altKey;
      if (
        tile !== null &&
        (tile !== current.lastTile || flipped !== current.flipped)
      ) {
        current.flipped = flipped;
        updateLine(current, tile);
      }
    } else if (current.moved) {
      // Dragging with any other tool moves the map
      camera.current.x = current.cameraX - dx / camera.current.zoom;
      camera.current.y = current.cameraY - dy / camera.current.zoom;
      clampCamera();
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    const {
      tool,
      onLine,
      onDragPlan,
      onTileClick,
      onTownClick,
      onVehicleClick,
    } = latest.current;

    // The map was let go: the cursor follows the pointer again
    if (isPanning(current)) {
      const point = pointAt(event);
      const tile = tileOf(point);
      setHover(tile);
      updateMyPresence({
        cursor: tile === null ? null : { x: point.x, y: point.y },
      });
    }

    if (current.mode === "line") {
      scene.current.preview = null;
      onDragPlan(null);
      if (isLineTool(tool) && current.tiles.length > 0) {
        onLine(tool, current.tiles);
      }
    } else if (current.mode === "click" && !current.moved) {
      const town = townAt(event);
      const point = pointAt(event);
      const tile = tileOf(point);
      const vehicle =
        tool === "select" && !latest.current.picking ? vehicleAt(point) : null;
      if (town !== null) {
        onTownClick(town);
      } else if (vehicle !== null) {
        onVehicleClick(vehicle);
      } else if (tile !== null) {
        onTileClick(tile);
      }
    }
  };

  const onPointerCancel = () => {
    drag.current = null;
    scene.current.preview = null;
    latest.current.onDragPlan(null);
  };

  const onPointerLeave = () => {
    if (!drag.current) {
      setHover(null);
      updateMyPresence({ cursor: null });
    }
  };

  const zoomButton = (factor: number) => () =>
    zoomAt(factor, viewport.current.width / 2, viewport.current.height / 2);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none select-none ${
          props.tool === "select" ? "cursor-grab" : "cursor-crosshair"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        onContextMenu={(event) => event.preventDefault()}
      />
      <div className="win absolute right-2 bottom-12 flex flex-col gap-px">
        <button
          type="button"
          className="win-button size-7 p-0"
          aria-label="Zoom in"
          onClick={zoomButton(1.3)}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          className="win-button size-7 p-0"
          aria-label="Zoom out"
          onClick={zoomButton(1 / 1.3)}
        >
          <Minus className="size-4" />
        </button>
      </div>
    </div>
  );
}
