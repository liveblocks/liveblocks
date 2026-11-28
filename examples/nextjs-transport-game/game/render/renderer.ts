import {
  BUILDINGS,
  CARGO,
  CATCHMENT,
  DOCK_CATCHMENT,
  TILE_H,
  TILE_W,
  TRAIN_WAGON_GAP,
  TRAIN_WAGONS,
} from "../constants";
import { type Clock, gameTime } from "../clock";
import { cargoBetween, catchmentOf, formatMoney, loadOf } from "../economy";
import { headDistance, type PathPoint, pointOnPath } from "../motion";
import {
  connectionsAt,
  EAST,
  gridOf,
  type Network,
  NORTH,
  SOUTH,
  WEST,
} from "../network";
import { hashInt } from "../rng";
import { townStats } from "../towns";
import type {
  Cargo,
  CompanyData,
  StationData,
  Tool,
  TrackKind,
  Vehicle,
} from "../types";
import {
  GRASS,
  INDUSTRY,
  INDUSTRY_SIZE,
  SAND,
  WATER,
  type World,
} from "../world";
import {
  box,
  type Ctx,
  HALF_H,
  HALF_W,
  orientedBox,
  type Point3,
  quad,
  shade,
  tileAt,
  tileDiamond,
  worldX,
  worldY,
} from "./shapes";
import {
  type CanvasFactory,
  createSprites,
  type Sprite,
  spriteImage,
  spriteScale,
} from "./sprites";

export type Camera = {
  // World position at the center of the screen
  x: number;
  y: number;
  zoom: number;
};

export type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

// Everything the renderer needs to draw a frame. The game keeps this object
// up to date from Liveblocks Storage and Presence, and the renderer reads it
// on every animation frame, so drawing never goes through React.
export type Scene = {
  network: Network;
  stations: ReadonlyMap<string, StationData>;
  vehicles: ReadonlyMap<string, Vehicle>;
  companies: ReadonlyMap<string, CompanyData>;
  // The company this player runs, if they picked one yet
  myCompany: string | null;
  tool: Tool;
  hover: number | null;
  // Tiles about to be built on or cleared while dragging
  preview: {
    tiles: number[];
    bad: ReadonlySet<number>;
    tone: "build" | "remove";
  } | null;
  // First station picked with the vehicle tool
  routeFrom: number | null;
  selectedStation: number | null;
  highlightedVehicle: string | null;
  // Other players' cursors, in tile coordinates
  cursors: { x: number; y: number; name: string; color: string }[];
  // Vehicles are drawn where they are on the game clock, so they stand
  // still while the game is paused
  clock: Clock;
};

type StaticItem = {
  depth: number;
  sprite: Sprite;
  x: number;
  y: number;
  // Trees disappear when something is built on their tile
  tile: number;
};

type DynamicItem = {
  depth: number;
  draw: () => void;
};

type Popup = {
  x: number;
  y: number;
  text: string;
  color: string;
  startedAt: number;
};

type Label = {
  x: number;
  y: number;
  z: number;
  text: string;
  size: number;
  minZoom: number;
};

const WATER_COLOR = "#4b90d2";
const POPUP_MS = 1800;
const POPUP_RISE = 60;
// How far above its center a town's name is drawn, depending on its tallest
// building (in the order of `BUILDINGS`)
const TOWN_LABEL_HEIGHTS = [58, 58, 62, 92, 150];
const MONEY_FONT = "Tahoma, Verdana, Geneva, sans-serif";
// How far above the middle of its tile a station's name sign is drawn: low
// enough to touch the tile, so it's clear which station it belongs to
const STATION_SIGN_HEIGHT = 20;
// How wide the wall of a canal's far bank looks, in tiles
const CANAL_WALL = 0.12;
const CANAL_OVERLAP = 0.05;

// Where a track leaves a tile toward each neighbor, in tile coordinates
// relative to the middle of the tile
const EDGE_OFFSETS: Record<number, [number, number]> = {
  [NORTH]: [0, -0.5],
  [EAST]: [0.5, 0],
  [SOUTH]: [0, 0.5],
  [WEST]: [-0.5, 0],
};
const DIRECTIONS = [NORTH, EAST, SOUTH, WEST];

// Adds the centerline of a track tile to a path, in tile coordinates: a
// straight line, a curve for corners, or one arm per neighbor for junctions.
// Returns whether the tile is a plain piece of track (not a junction).
function addTrackTile(path: Path2D, x: number, y: number, mask: number) {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const arms = DIRECTIONS.filter((direction) => mask & direction).map(
    (direction) => EDGE_OFFSETS[direction]
  );

  if (arms.length === 0) {
    path.moveTo(cx - 0.25, cy);
    path.lineTo(cx + 0.25, cy);
    return true;
  }

  if (arms.length === 2) {
    const [a, b] = arms;
    path.moveTo(cx + a[0], cy + a[1]);
    if (a[0] === -b[0] && a[1] === -b[1]) {
      path.lineTo(cx + b[0], cy + b[1]);
    } else {
      path.quadraticCurveTo(cx, cy, cx + b[0], cy + b[1]);
    }
    return true;
  }

  for (const arm of arms) {
    path.moveTo(cx, cy);
    path.lineTo(cx + arm[0], cy + arm[1]);
  }
  return arms.length === 1;
}

// A square piece of the ground, of `TERRAIN_CHUNK` tiles on each side
type TerrainChunk = {
  // Every tile of the same color, as one shape
  ground: { color: string; path: Path2D }[];
  grid: Path2D;
  ripples: Path2D;
  // The part of the map it covers, in world coordinates
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const TERRAIN_CHUNK = 16;
// From far away the ground is drawn from a picture of the whole map, which
// is no wider than this
const FAR_PICTURE_WIDTH = 4096;

// The ground is kept as shapes rather than as a picture, so the edges of
// tiles stay sharp however far the map is zoomed in. It is cut in pieces, so
// that on a big map only the pieces in view are drawn.
function buildTerrain(world: World) {
  const chunks: TerrainChunk[] = [];
  for (let y = 0; y < world.size; y += TERRAIN_CHUNK) {
    for (let x = 0; x < world.size; x += TERRAIN_CHUNK) {
      chunks.push(buildTerrainChunk(world, x, y));
    }
  }
  return chunks;
}

function buildTerrainChunk(world: World, x0: number, y0: number): TerrainChunk {
  const { size } = world;
  const x1 = Math.min(size, x0 + TERRAIN_CHUNK);
  const y1 = Math.min(size, y0 + TERRAIN_CHUNK);
  const ground = new Map<string, Path2D>();
  const grid = new Path2D();
  const ripples = new Path2D();

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const tile = y * size + x;
      const variation = world.shade[tile] / 255;
      const terrain = world.terrain[tile];
      const px = worldX(x, y);
      const py = worldY(x, y);

      if (terrain === WATER) {
        if (variation > 0.86) {
          ripples.moveTo(px - 7, py + HALF_H);
          ripples.lineTo(px + 5, py + HALF_H);
        }
        continue;
      }

      let base = "#7fbb58";
      if (terrain === SAND) {
        base = "#e3d4a2";
      } else if (terrain === GRASS && world.trees[tile] > 0) {
        base = "#6fae50";
      }
      const color = shade(base, 0.95 + Math.round(variation * 5) * 0.02);
      let path = ground.get(color);
      if (!path) {
        path = new Path2D();
        ground.set(color, path);
      }

      // Slightly oversized, so neighboring tiles leave no gaps
      path.moveTo(px, py - 0.5);
      path.lineTo(px + HALF_W + 1, py + HALF_H);
      path.lineTo(px, py + TILE_H + 0.5);
      path.lineTo(px - HALF_W - 1, py + HALF_H);
      path.closePath();

      // A faint grid helps with lining things up
      grid.moveTo(px - HALF_W, py + HALF_H);
      grid.lineTo(px, py + TILE_H);
      grid.lineTo(px + HALF_W, py + HALF_H);
    }
  }

  return {
    ground: [...ground].map(([color, path]) => ({ color, path })),
    grid,
    ripples,
    left: worldX(x0, y1) - 1,
    right: worldX(x1, y0) + 1,
    top: worldY(x0, y0) - 1,
    bottom: worldY(x1, y1) + 1,
  };
}

// Black or white, whichever reads best on top of a #rrggbb color
function inkOn(color: string) {
  const value = parseInt(color.slice(1), 16);
  const luminance =
    0.299 * ((value >> 16) & 255) +
    0.587 * ((value >> 8) & 255) +
    0.114 * (value & 255);
  return luminance > 150 ? "#171717" : "#ffffff";
}

function pill(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export class Renderer {
  private world: World;
  private readonly fontFamily: string;
  private readonly terrain: TerrainChunk[];
  private readonly createCanvas: CanvasFactory;
  // A picture of all the ground, made the first time the map is seen from
  // far away. Drawing thousands of tiny tiles one by one is slow.
  private farTerrain: HTMLCanvasElement | null = null;
  private readonly sprites: ReturnType<typeof createSprites>;
  private statics: StaticItem[] = [];
  private labels: Label[] = [];

  private trackNetwork: Network | null = null;
  private roadPath = new Path2D();
  private roadLinePath = new Path2D();
  private roadBridgePath = new Path2D();
  private railPath = new Path2D();
  private railBridgePath = new Path2D();
  private canalPath = new Path2D();
  private canalWallPath = new Path2D();
  private canalBankPath = new Path2D();

  private seenVehicles: ReadonlyMap<string, Vehicle> | null = null;
  private trips = new Map<string, number>();
  private routes = new Map<string, { passengers: boolean; freight: boolean }>();
  private popups: Popup[] = [];

  // Where town names were last drawn on screen, so they can be clicked
  private detail = spriteScale(1);
  private townLabels: { town: number; x: number; y: number; width: number }[] =
    [];

  constructor(world: World, createCanvas: CanvasFactory, fontFamily: string) {
    this.world = world;
    this.fontFamily = fontFamily;
    this.terrain = buildTerrain(world);
    this.createCanvas = createCanvas;
    this.sprites = createSprites(createCanvas);
    this.populate();
  }

  // Swaps in a version of the same map with different buildings on it (for
  // example after a house was demolished). The terrain doesn't change, so
  // only the list of things standing on it is rebuilt.
  setWorld(world: World) {
    if (world !== this.world) {
      this.world = world;
      this.populate();
    }
  }

  private populate() {
    const { world } = this;
    this.statics = [];
    this.labels = [];
    this.trackNetwork = null;
    this.routes.clear();

    const { sprites } = this;
    const { size } = world;
    const place = (
      sprite: Sprite,
      x: number,
      y: number,
      footprint: number,
      tile: number
    ) => {
      this.statics.push({
        depth: x + y + footprint,
        sprite,
        x: worldX(x, y) - sprite.ax,
        y: worldY(x, y) - sprite.ay,
        tile,
      });
    };

    for (let tile = 0; tile < size * size; tile++) {
      const count = world.trees[tile];
      if (count > 0) {
        const variants = sprites.trees[Math.min(count, 3) - 1];
        const variant = variants[hashInt(tile + world.seed) % variants.length];
        place(variant, tile % size, Math.floor(tile / size), 1, tile);
      }
    }
    for (let index = 0; index < world.houses.length; index++) {
      const house = world.houses[index];
      if (world.houseAt[house.y * size + house.x] !== index) {
        continue;
      }
      const colors = sprites.houses[house.variant];
      const color = colors[hashInt(house.y * size + house.x) % colors.length];
      place(color, house.x, house.y, BUILDINGS[house.variant].size ?? 1, -1);
    }
    for (const industry of world.industries) {
      place(
        sprites.industries[industry.type],
        industry.x,
        industry.y,
        INDUSTRY_SIZE,
        -1
      );
      this.labels.push({
        x: industry.x + 1,
        y: industry.y + 1,
        z: 58,
        text: INDUSTRY[industry.type].label,
        size: 11,
        minZoom: 0.55,
      });
    }
    this.statics.sort((a, b) => a.depth - b.depth);
  }

  // The town whose name is drawn at this point of the screen, if any
  townAt(screenX: number, screenY: number) {
    for (const label of this.townLabels) {
      if (
        Math.abs(screenX - label.x) <= label.width / 2 + 4 &&
        Math.abs(screenY - label.y) <= 12
      ) {
        return label.town;
      }
    }
    return null;
  }

  render(
    ctx: Ctx,
    viewport: Viewport,
    camera: Camera,
    scene: Scene,
    now: number,
    // A second, smaller view of the same map, e.g. the camera that follows
    // a vehicle. It only shows the map itself, without labels or markers.
    secondary = false
  ) {
    const { width, height, dpr } = viewport;
    const { zoom } = camera;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = WATER_COLOR;
    ctx.fillRect(0, 0, width, height);

    ctx.setTransform(
      dpr * zoom,
      0,
      0,
      dpr * zoom,
      dpr * (width / 2 - camera.x * zoom),
      dpr * (height / 2 - camera.y * zoom)
    );

    const left = camera.x - width / 2 / zoom;
    const right = camera.x + width / 2 / zoom;
    const top = camera.y - height / 2 / zoom;
    const bottom = camera.y + height / 2 / zoom;

    this.drawTerrain(ctx, zoom, dpr, left, right, top, bottom);
    this.drawCanals(ctx, scene.network);

    this.drawStationPads(ctx, scene);
    const time = gameTime(scene.clock, now);
    const { dynamics, underBridges } = this.collectDynamics(ctx, scene, time);
    for (const ship of underBridges) {
      ship.draw();
    }
    this.drawTracks(ctx, scene.network);

    // Buildings, trees, stations and vehicles, from the back of the map to
    // the front, so that things closer to the camera cover what's behind
    // Sprites only keep one version of their picture, so a second view
    // makes do with the one the main view asked for
    if (!secondary) {
      this.detail = spriteScale(dpr * zoom);
    }
    const { detail } = this;
    let staticIndex = 0;
    let dynamicIndex = 0;
    while (
      staticIndex < this.statics.length ||
      dynamicIndex < dynamics.length
    ) {
      const item = this.statics[staticIndex];
      const dynamic = dynamics[dynamicIndex];
      if (!dynamic || (item && item.depth <= dynamic.depth)) {
        staticIndex++;
        const { sprite } = item;
        const hidden =
          item.x > right ||
          item.y > bottom ||
          item.x + sprite.width < left ||
          item.y + sprite.height < top ||
          (item.tile >= 0 &&
            (scene.network.road[item.tile] ||
              scene.network.rail[item.tile] ||
              scene.network.canal[item.tile]));
        if (!hidden) {
          ctx.drawImage(
            spriteImage(sprite, detail),
            item.x,
            item.y,
            sprite.width,
            sprite.height
          );
        }
      } else {
        dynamicIndex++;
        dynamic.draw();
      }
    }

    if (secondary) {
      return;
    }
    this.drawOverlays(ctx, scene, zoom);

    // Labels and markers keep the same size on screen whatever the zoom
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const screenX = (wx: number) => (wx - camera.x) * zoom + width / 2;
    const screenY = (wy: number) => (wy - camera.y) * zoom + height / 2;
    this.drawLabels(ctx, scene, zoom, screenX, screenY, now, time);
  }

  private drawTerrain(
    ctx: Ctx,
    zoom: number,
    dpr: number,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    // The picture is only used where it is shown at its own size or smaller,
    // so the ground never looks blurry
    const { size } = this.world;
    const scale = Math.min(0.5 * dpr, FAR_PICTURE_WIDTH / (size * TILE_W));
    if (size > TERRAIN_CHUNK * 4 && zoom * dpr <= scale) {
      this.farTerrain ??= this.paintTerrain(scale);
      ctx.drawImage(
        this.farTerrain,
        worldX(0, size),
        0,
        size * TILE_W,
        size * TILE_H
      );
      return;
    }
    this.drawTiles(ctx, zoom, left, right, top, bottom);
  }

  private drawTiles(
    ctx: Ctx,
    zoom: number,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    const visible = this.terrain.filter(
      (chunk) =>
        chunk.left < right &&
        chunk.right > left &&
        chunk.top < bottom &&
        chunk.bottom > top
    );
    for (const chunk of visible) {
      for (const { color, path } of chunk.ground) {
        ctx.fillStyle = color;
        ctx.fill(path);
      }
    }
    // Both stay one pixel wide on screen. They go on top of all the ground,
    // as tiles are drawn a little over their edges.
    ctx.lineWidth = 1 / zoom;
    for (const chunk of visible) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
      ctx.stroke(chunk.ripples);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
      ctx.stroke(chunk.grid);
    }
  }

  private paintTerrain(scale: number) {
    const { size } = this.world;
    const canvas = this.createCanvas(
      Math.ceil(size * TILE_W * scale),
      Math.ceil(size * TILE_H * scale)
    );
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(scale, 0, 0, scale, -worldX(0, size) * scale, 0);
      this.drawTiles(ctx, scale, -Infinity, Infinity, -Infinity, Infinity);
    }
    return canvas;
  }

  private rebuildTracks(network: Network) {
    const { size } = this.world;
    this.trackNetwork = network;
    this.roadPath = new Path2D();
    this.roadLinePath = new Path2D();
    this.roadBridgePath = new Path2D();
    this.railPath = new Path2D();
    this.railBridgePath = new Path2D();
    this.canalPath = new Path2D();
    this.canalWallPath = new Path2D();
    this.canalBankPath = new Path2D();

    const isLand = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < size && y < size && !network.water[y * size + x];

    for (let tile = 0; tile < size * size; tile++) {
      const x = tile % size;
      const y = Math.floor(tile / size);
      const onWater = network.water[tile] === 1;

      if (network.canal[tile]) {
        // Canals are dug into the ground: the banks on the far side show
        // their wall, and every bank gets a stone edge. Where a canal meets
        // other water, it is drawn a little past the edge of its tile, to
        // cover the rim of the ground under it.
        const bank = (x0: number, y0: number, x1: number, y1: number) => {
          this.canalBankPath.moveTo(x0, y0);
          this.canalBankPath.lineTo(x1, y1);
        };
        let x0 = x - CANAL_OVERLAP;
        let y0 = y - CANAL_OVERLAP;
        let x1 = x + 1 + CANAL_OVERLAP;
        let y1 = y + 1 + CANAL_OVERLAP;
        if (isLand(x, y - 1)) {
          y0 = y;
          this.canalWallPath.rect(x, y, 1, CANAL_WALL);
          bank(x, y, x + 1, y);
        }
        if (isLand(x - 1, y)) {
          x0 = x;
          this.canalWallPath.rect(x, y, CANAL_WALL, 1);
          bank(x, y, x, y + 1);
        }
        if (isLand(x + 1, y)) {
          x1 = x + 1;
          bank(x + 1, y, x + 1, y + 1);
        }
        if (isLand(x, y + 1)) {
          y1 = y + 1;
          bank(x, y + 1, x + 1, y + 1);
        }
        this.canalPath.rect(x0, y0, x1 - x0, y1 - y0);
      }

      if (network.road[tile]) {
        const mask = connectionsAt(network.road, size, tile);
        if (addTrackTile(this.roadPath, x, y, mask)) {
          addTrackTile(this.roadLinePath, x, y, mask);
        }
        if (onWater) {
          addTrackTile(this.roadBridgePath, x, y, mask);
        }
      }
      if (network.rail[tile]) {
        const mask = connectionsAt(network.rail, size, tile);
        addTrackTile(this.railPath, x, y, mask);
        if (onWater) {
          addTrackTile(this.railBridgePath, x, y, mask);
        }
      }
    }
  }

  // Canals are part of the ground, like the water they are filled with
  private drawCanals(ctx: Ctx, network: Network) {
    if (this.trackNetwork !== network) {
      this.rebuildTracks(network);
    }
    ctx.save();
    ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
    ctx.fillStyle = WATER_COLOR;
    ctx.fill(this.canalPath);
    ctx.fillStyle = "#6f757c";
    ctx.fill(this.canalWallPath);
    ctx.lineWidth = 0.07;
    ctx.lineCap = "square";
    ctx.strokeStyle = "#b4b9bf";
    ctx.stroke(this.canalBankPath);
    ctx.restore();
  }

  private drawTracks(ctx: Ctx, network: Network) {
    if (this.trackNetwork !== network) {
      this.rebuildTracks(network);
    }

    // Tracks are stroked in tile coordinates, under the same transform that
    // lays tiles out on screen. Widths, corners, sleepers and lane markings
    // then get foreshortened like the ground they sit on, instead of looking
    // like lines of constant thickness drawn over the map.
    const stroke = (
      path: Path2D,
      width: number,
      color: string,
      dash?: number[],
      // How far the layer is pushed down the screen, in pixels
      drop = 0
    ) => {
      ctx.save();
      ctx.translate(0, drop);
      ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.lineJoin = "round";
      ctx.lineCap = dash ? "butt" : "round";
      ctx.setLineDash(dash ?? []);
      // Start on half a gap, so dashes are spaced evenly from tile to tile
      ctx.lineDashOffset = dash ? -dash[1] / 2 : 0;
      ctx.stroke(path);
      ctx.restore();
    };

    // The sides of bridge decks, peeking out below the tracks
    stroke(this.roadBridgePath, 0.58, "#3b4047", undefined, 6);
    stroke(this.railBridgePath, 0.52, "#4a443b", undefined, 6);

    // Roads: a verge that drops away on the side facing the camera, a
    // pavement, the asphalt, and a dashed centerline
    stroke(this.roadPath, 0.6, "rgba(40, 52, 30, 0.45)", undefined, 1.5);
    stroke(this.roadPath, 0.58, "#b7b3a8");
    stroke(this.roadPath, 0.46, "#6d7179");
    stroke(this.roadPath, 0.42, "#7b8088");
    stroke(this.roadLinePath, 0.028, "rgba(255, 255, 255, 0.75)", [0.14, 0.11]);

    // Railways: a ballast bed, sleepers across it, and two rails. The rails
    // are one dark stroke with the bed and sleepers painted again inside.
    stroke(this.railPath, 0.54, "rgba(40, 36, 26, 0.5)", undefined, 2);
    stroke(this.railPath, 0.52, "#8f8674");
    stroke(this.railPath, 0.46, "#aba28f");
    stroke(this.railPath, 0.36, "#5d4a38", [0.05, 0.075]);
    stroke(this.railPath, 0.27, "#2c2f34");
    stroke(this.railPath, 0.19, "#aba28f");
    stroke(this.railPath, 0.19, "#5d4a38", [0.05, 0.075]);
    stroke(this.railPath, 0.25, "rgba(255, 255, 255, 0.18)", [0.02, 0.105]);
  }

  private drawStationPads(ctx: Ctx, scene: Scene) {
    const { size } = this.world;
    for (const [key, station] of scene.stations) {
      const tile = Number(key);
      tileDiamond(ctx, tile % size, Math.floor(tile / size), 1);
      // Docks are out on the water: only their berth is marked
      ctx.fillStyle =
        station.kind === "water" ? "rgba(255, 255, 255, 0.2)" : "#c9c3b6";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = scene.companies.get(station.owner)?.color ?? "#888888";
      ctx.stroke();
    }
  }

  private collectDynamics(ctx: Ctx, scene: Scene, now: number) {
    const { size } = this.world;
    const dynamics: DynamicItem[] = [];
    // Ships that are passing under a bridge: they are drawn before the
    // tracks, so that the bridge covers them
    const underBridges: DynamicItem[] = [];
    const colorOf = (owner: string) =>
      scene.companies.get(owner)?.color ?? "#888888";
    const isBridge = (x: number, y: number) => {
      const tile = Math.floor(y) * size + Math.floor(x);
      return scene.network.road[tile] === 1 || scene.network.rail[tile] === 1;
    };

    for (const [key, station] of scene.stations) {
      const tile = Number(key);
      const x = tile % size;
      const y = Math.floor(tile / size);
      if (station.kind === "water") {
        const side = this.shoreSide(scene.network.water, tile);
        const color = colorOf(station.owner);
        // A pier on the far side of the tile is behind a ship moored at the
        // dock, and one on the near side is in front of it
        const behind = side === NORTH || side === WEST;
        dynamics.push({
          depth: x + y + (behind ? 0.3 : 1.5),
          draw: () => drawDock(ctx, x, y, side, color),
        });
        continue;
      }
      const { kind } = station;
      const mask = connectionsAt(gridOf(scene.network, kind), size, tile);
      const alongX = mask === 0 || (mask & (EAST | WEST)) !== 0;
      const color = colorOf(station.owner);
      dynamics.push({
        depth: x + y + 0.55,
        draw: () => drawStation(ctx, x, y, kind, alongX, color),
      });
    }

    const point: PathPoint = { x: 0, y: 0, dx: 1, dy: 0 };
    for (const [id, vehicle] of scene.vehicles) {
      const color = colorOf(vehicle.owner);
      // A route with both passengers and freight gets a vehicle for both:
      // a train pulls a coach and freight wagons, and a road vehicle or a
      // ship looks like whatever it is carrying at the moment
      const route = this.routeCargo(id, vehicle);
      const cargo =
        loadOf(vehicle).find((each) => each.cargo !== "passengers")?.cargo ??
        null;
      const passengers = route.passengers && (!route.freight || cargo === null);

      if (vehicle.path.length < 2) {
        // Waiting for a route: parked at its station
        const tile = Number(vehicle.stops[vehicle.leg % vehicle.stops.length]);
        point.x = (tile % size) + 0.5;
        point.y = Math.floor(tile / size) + 0.5;
        point.dx = 1;
        point.dy = 0;
      } else {
        pointOnPath(vehicle.path, size, headDistance(vehicle, now), point);
      }

      if (vehicle.kind === "water") {
        const { x, y, dx, dy } = point;
        const under =
          isBridge(x, y) ||
          isBridge(x + dx * SHIP_LENGTH * 0.5, y + dy * SHIP_LENGTH * 0.5) ||
          isBridge(x - dx * SHIP_LENGTH * 0.5, y - dy * SHIP_LENGTH * 0.5);
        (under ? underBridges : dynamics).push({
          depth: x + y,
          draw: () => drawShip(ctx, x, y, dx, dy, color, passengers, cargo),
        });
        continue;
      }

      if (vehicle.kind === "road") {
        // Keep to the right, so vehicles going opposite ways don't overlap
        const x = point.x - point.dy * 0.11;
        const y = point.y + point.dx * 0.11;
        const { dx, dy } = point;
        dynamics.push({
          depth: x + y,
          draw: () =>
            drawRoadVehicle(ctx, x, y, dx, dy, color, passengers, cargo),
        });
        continue;
      }

      const head = headDistance(vehicle, now);
      for (let car = 0; car <= TRAIN_WAGONS; car++) {
        if (vehicle.path.length >= 2) {
          const distance = Math.max(0, head - car * TRAIN_WAGON_GAP);
          pointOnPath(vehicle.path, size, distance, point);
        } else if (car > 0) {
          break;
        }
        const { x, y, dx, dy } = point;
        dynamics.push({
          depth: x + y,
          draw: () =>
            drawTrainCar(
              ctx,
              x,
              y,
              dx,
              dy,
              color,
              car === 0,
              route.passengers && (!route.freight || car === 1),
              cargo
            ),
        });
      }
    }

    dynamics.sort((a, b) => a.depth - b.depth);
    return { dynamics, underBridges };
  }

  // Which side of a water tile the land is on. A dock's pier goes there.
  private shoreSide(water: Uint8Array, tile: number) {
    const { size } = this.world;
    const x = tile % size;
    const y = Math.floor(tile / size);
    if (y > 0 && !water[tile - size]) {
      return NORTH;
    }
    if (x > 0 && !water[tile - 1]) {
      return WEST;
    }
    if (x < size - 1 && !water[tile + 1]) {
      return EAST;
    }
    return SOUTH;
  }

  // Whether a vehicle's route has passengers to carry, freight, or both
  private routeCargo(id: string, vehicle: Vehicle) {
    let route = this.routes.get(id);
    if (!route) {
      const [from, to] = vehicle.stops.map(Number);
      const kinds = [
        ...cargoBetween(this.world, from, to),
        ...cargoBetween(this.world, to, from),
      ];
      route = {
        passengers: kinds.includes("passengers"),
        freight: kinds.some((cargo) => cargo !== "passengers"),
      };
      this.routes.set(id, route);
    }
    return route;
  }

  private drawOverlays(ctx: Ctx, scene: Scene, zoom: number) {
    const { size } = this.world;
    const outline = (
      tile: number,
      color: string,
      width: number,
      fill?: string
    ) => {
      tileDiamond(ctx, tile % size, Math.floor(tile / size));
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.lineWidth = width / zoom;
      ctx.strokeStyle = color;
      ctx.stroke();
    };

    const catchment = (tile: number, reach: number) => {
      const x = tile % size;
      const y = Math.floor(tile / size);
      const x0 = Math.max(0, x - reach);
      const y0 = Math.max(0, y - reach);
      const x1 = Math.min(size, x + reach + 1);
      const y1 = Math.min(size, y + reach + 1);
      ctx.beginPath();
      ctx.moveTo(worldX(x0, y0), worldY(x0, y0));
      ctx.lineTo(worldX(x1, y0), worldY(x1, y0));
      ctx.lineTo(worldX(x1, y1), worldY(x1, y1));
      ctx.lineTo(worldX(x0, y1), worldY(x0, y1));
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.fill();
      ctx.setLineDash([6 / zoom, 5 / zoom]);
      ctx.lineWidth = 1.5 / zoom;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (scene.selectedStation !== null) {
      catchment(
        scene.selectedStation,
        catchmentOf(this.world, scene.selectedStation)
      );
      outline(scene.selectedStation, "#ffffff", 2.5);
    }

    if (scene.hover !== null) {
      if (scene.tool === "water-station") {
        // A dock on a canal reaches as far as any other station
        catchment(
          scene.hover,
          scene.network.canal[scene.hover] ? CATCHMENT : DOCK_CATCHMENT
        );
      } else if (
        scene.tool === "road-station" ||
        scene.tool === "rail-station"
      ) {
        catchment(scene.hover, CATCHMENT);
      }
    }

    if (scene.preview) {
      for (const tile of scene.preview.tiles) {
        const bad =
          scene.preview.tone === "remove" || scene.preview.bad.has(tile);
        outline(
          tile,
          bad ? "rgba(185, 28, 28, 0.9)" : "rgba(21, 128, 61, 0.9)",
          1,
          bad ? "rgba(239, 68, 68, 0.45)" : "rgba(74, 222, 128, 0.5)"
        );
      }
    }

    if (scene.routeFrom !== null) {
      const color =
        scene.companies.get(scene.myCompany ?? "")?.color ?? "#ffffff";
      outline(scene.routeFrom, color, 3.5, "rgba(255, 255, 255, 0.35)");
      const target =
        scene.hover !== null
          ? scene.stations.get(String(scene.hover))
          : undefined;
      if (
        scene.hover !== null &&
        scene.hover !== scene.routeFrom &&
        target?.owner === scene.myCompany
      ) {
        const from = scene.routeFrom;
        const to = scene.hover;
        ctx.beginPath();
        ctx.moveTo(
          worldX((from % size) + 0.5, Math.floor(from / size) + 0.5),
          worldY((from % size) + 0.5, Math.floor(from / size) + 0.5)
        );
        ctx.lineTo(
          worldX((to % size) + 0.5, Math.floor(to / size) + 0.5),
          worldY((to % size) + 0.5, Math.floor(to / size) + 0.5)
        );
        ctx.setLineDash([8 / zoom, 6 / zoom]);
        ctx.lineWidth = 2.5 / zoom;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const cursor of scene.cursors) {
      const x = Math.floor(cursor.x);
      const y = Math.floor(cursor.y);
      if (x >= 0 && y >= 0 && x < size && y < size) {
        outline(y * size + x, cursor.color, 2.5);
      }
    }

    if (scene.hover !== null) {
      outline(
        scene.hover,
        scene.tool === "bulldoze" ? "#ef4444" : "#ffffff",
        2,
        "rgba(255, 255, 255, 0.18)"
      );
    }
  }

  private drawLabels(
    ctx: Ctx,
    scene: Scene,
    zoom: number,
    screenX: (wx: number) => number,
    screenY: (wy: number) => number,
    now: number,
    // The same moment on the game clock, which is what vehicles go by
    time: number
  ) {
    const { size } = this.world;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    const text = (
      value: string,
      x: number,
      y: number,
      fontSize: number,
      color = "#ffffff"
    ) => {
      ctx.font = `600 ${fontSize}px ${this.fontFamily}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
      ctx.strokeText(value, x, y);
      ctx.fillStyle = color;
      ctx.fillText(value, x, y);
    };

    for (const label of this.labels) {
      if (zoom >= label.minZoom) {
        text(
          label.text,
          screenX(worldX(label.x, label.y)),
          screenY(worldY(label.x, label.y) - label.z),
          label.size
        );
      }
    }

    // Town names, with their population. They can be clicked, so remember
    // where each one ends up on screen.
    const stats = townStats(this.world);
    this.townLabels = [];
    for (const town of this.world.towns) {
      const { population, tallest } = stats[town.id];
      const label = `${town.name} (${population.toLocaleString("en-US")})`;
      // The name floats above the town's skyline
      const height = TOWN_LABEL_HEIGHTS[tallest];
      const x = screenX(worldX(town.x + 0.5, town.y + 0.5));
      const y = screenY(worldY(town.x + 0.5, town.y + 0.5) - height);
      text(label, x, y, 14);
      this.townLabels.push({
        town: town.id,
        x,
        y,
        width: ctx.measureText(label).width,
      });
    }

    if (zoom >= 0.7) {
      for (const [key, station] of scene.stations) {
        const tile = Number(key);
        const x = (tile % size) + 0.5;
        const y = Math.floor(tile / size) + 0.5;
        const sx = screenX(worldX(x, y));
        const sy = screenY(worldY(x, y) - STATION_SIGN_HEIGHT);
        const color = scene.companies.get(station.owner)?.color ?? "#888888";
        ctx.font = `700 11px ${this.fontFamily}`;
        const width = Math.ceil(ctx.measureText(station.name).width) + 10;
        const left = Math.round(sx - width / 2);
        const top = Math.round(sy - 8);
        // A sign in the company's color, with a raised edge
        ctx.fillStyle = "#000000";
        ctx.fillRect(left - 1, top - 1, width + 2, 18);
        ctx.fillStyle = color;
        ctx.fillRect(left, top, width, 16);
        ctx.fillStyle = shade(color, 1.4);
        ctx.fillRect(left, top, width, 1);
        ctx.fillRect(left, top, 1, 16);
        ctx.fillStyle = shade(color, 0.7);
        ctx.fillRect(left, top + 15, width, 1);
        ctx.fillRect(left + width - 1, top, 1, 16);
        ctx.fillStyle = inkOn(color);
        ctx.fillText(station.name, left + width / 2, top + 8.5);
      }
    }

    // Vehicles: warnings for the ones without a route, a marker on the one
    // highlighted in the vehicle list, and income popups when they deliver
    this.trackDeliveries(scene, now);
    const point: PathPoint = { x: 0, y: 0, dx: 1, dy: 0 };
    for (const [id, vehicle] of scene.vehicles) {
      const stalled = vehicle.path.length < 2 && vehicle.departAt > time;
      const highlighted = id === scene.highlightedVehicle;
      if (!stalled && !highlighted) {
        continue;
      }
      if (vehicle.path.length < 2) {
        const tile = Number(vehicle.stops[vehicle.leg % vehicle.stops.length]);
        point.x = (tile % size) + 0.5;
        point.y = Math.floor(tile / size) + 0.5;
      } else {
        pointOnPath(vehicle.path, size, headDistance(vehicle, time), point);
      }
      const sx = screenX(worldX(point.x, point.y));
      const sy = screenY(worldY(point.x, point.y));
      if (highlighted) {
        ctx.beginPath();
        ctx.arc(sx, sy - 4 * zoom, 16, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#171717";
        ctx.stroke();
      }
      if (stalled) {
        text("!", sx, sy - 14 * zoom - 8, 15, "#fca5a5");
      }
    }

    // Income floats up from the vehicle that earned it, in the same style as
    // the money that floats up from the cursor when a player spends some
    this.popups = this.popups.filter(
      (popup) => now - popup.startedAt < POPUP_MS
    );
    ctx.font = `700 14px ${MONEY_FONT}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000000";
    for (const popup of this.popups) {
      const progress = Math.max(0, (now - popup.startedAt) / POPUP_MS);
      const x = screenX(worldX(popup.x, popup.y));
      const y =
        screenY(worldY(popup.x, popup.y)) -
        12 * zoom -
        (1 - (1 - progress) ** 2) * POPUP_RISE;
      ctx.globalAlpha = 1 - progress ** 3;
      ctx.strokeText(popup.text, x, y);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, x, y);
    }
    ctx.globalAlpha = 1;

    for (const cursor of scene.cursors) {
      const sx = screenX(worldX(cursor.x, cursor.y));
      const sy = screenY(worldY(cursor.x, cursor.y));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 15);
      ctx.lineTo(sx + 4, sy + 11.5);
      ctx.lineTo(sx + 10.5, sy + 11);
      ctx.closePath();
      ctx.fillStyle = cursor.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.font = `600 11px ${this.fontFamily}`;
      const width = ctx.measureText(cursor.name).width + 12;
      pill(ctx, sx + 10, sy + 14, width, 18, 6);
      ctx.fillStyle = cursor.color;
      ctx.fill();
      ctx.fillStyle = inkOn(cursor.color);
      ctx.fillText(cursor.name, sx + 10 + width / 2, sy + 23.5);
    }
  }

  // Spawns a "+$1,200" popup whenever a vehicle completes a paid delivery.
  // Every client derives these from Storage updates, so everyone sees them.
  private trackDeliveries(scene: Scene, now: number) {
    if (this.seenVehicles === scene.vehicles) {
      return;
    }
    const firstTime = this.seenVehicles === null;
    this.seenVehicles = scene.vehicles;

    const { size } = this.world;
    const trips = new Map<string, number>();
    for (const [id, vehicle] of scene.vehicles) {
      trips.set(id, vehicle.trips);
      const previous = this.trips.get(id);
      if (
        firstTime ||
        previous === undefined ||
        vehicle.trips <= previous ||
        vehicle.lastIncome <= 0
      ) {
        continue;
      }
      const tile = Number(vehicle.stops[vehicle.leg % vehicle.stops.length]);
      this.popups.push({
        x: (tile % size) + 0.5,
        y: Math.floor(tile / size) + 0.5,
        text: `+${formatMoney(vehicle.lastIncome)}`,
        color: vehicle.owner === scene.myCompany ? "#7dff6b" : "#ffffff",
        startedAt: now,
      });
    }
    this.trips = trips;
  }

  // The tile under a point on screen, as fractional tile coordinates
  static screenToTile(
    viewport: Viewport,
    camera: Camera,
    screenX: number,
    screenY: number
  ) {
    return tileAt(
      (screenX - viewport.width / 2) / camera.zoom + camera.x,
      (screenY - viewport.height / 2) / camera.zoom + camera.y
    );
  }
}

function drawStation(
  ctx: Ctx,
  x: number,
  y: number,
  kind: TrackKind,
  alongX: boolean,
  color: string
) {
  if (kind === "road") {
    if (alongX) {
      box(
        ctx,
        0,
        0,
        x + 0.14,
        y + 0.03,
        x + 0.86,
        y + 0.2,
        0,
        9,
        "#eceef0",
        color
      );
    } else {
      box(
        ctx,
        0,
        0,
        x + 0.03,
        y + 0.14,
        x + 0.2,
        y + 0.86,
        0,
        9,
        "#eceef0",
        color
      );
    }
    return;
  }

  const roof = shade(color, 0.8);
  if (alongX) {
    box(
      ctx,
      0,
      0,
      x + 0.08,
      y + 0.03,
      x + 0.92,
      y + 0.22,
      0,
      12,
      "#efe6d6",
      roof
    );
    box(ctx, 0, 0, x + 0.04, y + 0.01, x + 0.96, y + 0.3, 12, 14, color);
  } else {
    box(
      ctx,
      0,
      0,
      x + 0.03,
      y + 0.08,
      x + 0.22,
      y + 0.92,
      0,
      12,
      "#efe6d6",
      roof
    );
    box(ctx, 0, 0, x + 0.01, y + 0.04, x + 0.3, y + 0.96, 12, 14, color);
  }
}

// A wooden pier along the shore, with a harbor office in the company's color
function drawDock(ctx: Ctx, x: number, y: number, side: number, color: string) {
  const wood = "#a07c50";
  const planks = "#c39e6c";
  const depth = 0.32;
  const alongX = side === NORTH || side === SOUTH;
  // The pier runs along the edge of the tile that touches land
  let x0 = x + 0.04;
  let y0 = y + 0.04;
  let x1 = x + 0.96;
  let y1 = y + 0.96;
  if (side === NORTH) {
    y0 = y - 0.06;
    y1 = y + depth;
  } else if (side === SOUTH) {
    y0 = y + 1 - depth;
    y1 = y + 1.06;
  } else if (side === WEST) {
    x0 = x - 0.06;
    x1 = x + depth;
  } else {
    x0 = x + 1 - depth;
    x1 = x + 1.06;
  }
  box(ctx, 0, 0, x0, y0, x1, y1, 0, 4, wood, planks);

  const office = alongX
    ? ([x0 + 0.08, y0 + 0.06, x0 + 0.36, y1 - 0.06] as const)
    : ([x0 + 0.06, y0 + 0.08, x1 - 0.06, y0 + 0.36] as const);
  box(
    ctx,
    0,
    0,
    office[0],
    office[1],
    office[2],
    office[3],
    4,
    12,
    "#efe6d6",
    color
  );

  // Bollards to tie ships to
  for (const along of [0.55, 0.8]) {
    const bx = alongX ? x0 + along * (x1 - x0) : (x0 + x1) / 2;
    const by = alongX ? (y0 + y1) / 2 : y0 + along * (y1 - y0);
    box(
      ctx,
      0,
      0,
      bx - 0.025,
      by - 0.025,
      bx + 0.025,
      by + 0.025,
      4,
      7,
      "#3f4348"
    );
  }
}

const SHIP_LENGTH = 0.74;
// The outline of a hull seen from above, as [along, across] in tiles, with
// the bow pointing along the first axis
const HULL: readonly (readonly [number, number])[] = [
  [0.37, 0],
  [0.2, 0.1],
  [-0.33, 0.1],
  [-0.37, 0.06],
  [-0.37, -0.06],
  [-0.33, -0.1],
  [0.2, -0.1],
];
const HULL_HEIGHT = 5;

function drawShip(
  ctx: Ctx,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  passengers: boolean,
  cargo: Cargo | null
) {
  const outline = (z: number, grow = 1): Point3[] =>
    HULL.map(([along, across]) => [
      x + (dx * along - dy * across) * grow,
      y + (dy * along + dx * across) * grow,
      z,
    ]);

  // Foam around the hull, then the hull itself, built up in thin layers so
  // it looks right from every direction
  quad(ctx, 0, 0, outline(0, 1.18), "rgba(255, 255, 255, 0.4)");
  for (let z = 0; z < HULL_HEIGHT; z++) {
    quad(ctx, 0, 0, outline(z), z < HULL_HEIGHT - 2 ? "#2b3440" : color);
  }
  quad(ctx, 0, 0, outline(HULL_HEIGHT), passengers ? "#e8edf2" : "#c9b48a");

  // Parts on deck, by how far along the hull they are (the bow is positive)
  const part = (
    along: number,
    length: number,
    width: number,
    z0: number,
    z1: number,
    side: string,
    top = side
  ) =>
    orientedBox(
      ctx,
      x + dx * along,
      y + dy * along,
      dx,
      dy,
      length,
      width,
      z0,
      z1,
      side,
      top
    );
  const deck = HULL_HEIGHT;
  const load = cargoColor(cargo);

  const parts = passengers
    ? [
        // A ferry: a long cabin, with a funnel toward the stern
        () =>
          part(
            -0.16,
            0.07,
            0.07,
            deck + 5,
            deck + 10,
            color,
            shade(color, 0.7)
          ),
        () => {
          part(-0.02, 0.44, 0.15, deck, deck + 1.5, "#f4f4f5");
          part(-0.02, 0.44, 0.15, deck + 1.5, deck + 3.5, "#6f8fae");
          part(-0.02, 0.44, 0.15, deck + 3.5, deck + 5, "#f4f4f5", "#ffffff");
        },
      ]
    : [
        // A freighter: the bridge at the stern, and a hold in front of it
        () => part(-0.25, 0.12, 0.15, deck, deck + 8, "#f4f4f5", color),
        () =>
          part(0.01, 0.36, 0.13, deck, deck + 2, "#6b7078", load ?? "#4b5057"),
      ];
  // Whichever part is further from the camera goes first
  if (dx + dy < 0) {
    parts.reverse();
  }
  for (const draw of parts) {
    draw();
  }
}

function cargoColor(cargo: Cargo | null) {
  return cargo ? CARGO[cargo].color : null;
}

function shadow(
  ctx: Ctx,
  x: number,
  y: number,
  dx: number,
  dy: number,
  length: number,
  width: number
) {
  orientedBox(ctx, x, y, dx, dy, length, width, 0, 0, "rgba(0, 0, 0, 0.22)");
}

function drawRoadVehicle(
  ctx: Ctx,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  passengers: boolean,
  cargo: Cargo | null
) {
  shadow(ctx, x, y, dx, dy, 0.4, 0.2);

  if (passengers) {
    orientedBox(ctx, x, y, dx, dy, 0.36, 0.16, 1.5, 7, color);
    orientedBox(ctx, x, y, dx, dy, 0.34, 0.15, 7, 9, "#dbe4ec", "#f4f4f5");
    return;
  }

  const load = cargoColor(cargo);
  const cab = () =>
    orientedBox(
      ctx,
      x + dx * 0.125,
      y + dy * 0.125,
      dx,
      dy,
      0.11,
      0.16,
      1.5,
      9,
      color,
      shade(color, 1.2)
    );
  const bed = () => {
    orientedBox(
      ctx,
      x - dx * 0.055,
      y - dy * 0.055,
      dx,
      dy,
      0.25,
      0.16,
      1.5,
      4.5,
      "#6b7078"
    );
    if (load) {
      orientedBox(
        ctx,
        x - dx * 0.055,
        y - dy * 0.055,
        dx,
        dy,
        0.23,
        0.14,
        4.5,
        8,
        load,
        shade(load, 1.2)
      );
    }
  };

  // Whichever half is further from the camera goes first
  if (dx + dy > 0) {
    bed();
    cab();
  } else {
    cab();
    bed();
  }
}

function drawTrainCar(
  ctx: Ctx,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  locomotive: boolean,
  passengers: boolean,
  cargo: Cargo | null
) {
  shadow(ctx, x, y, dx, dy, 0.42, 0.22);

  if (locomotive) {
    orientedBox(ctx, x, y, dx, dy, 0.38, 0.18, 1.5, 10, color);
    orientedBox(ctx, x, y, dx, dy, 0.3, 0.14, 10, 12, "#3f4348", "#565b63");
    return;
  }

  if (passengers) {
    orientedBox(ctx, x, y, dx, dy, 0.36, 0.17, 1.5, 6, color);
    orientedBox(
      ctx,
      x,
      y,
      dx,
      dy,
      0.36,
      0.17,
      6,
      9.5,
      "#e5eaf0",
      shade(color, 0.85)
    );
    return;
  }

  const load = cargoColor(cargo);
  orientedBox(ctx, x, y, dx, dy, 0.36, 0.17, 1.5, 5, "#6b7078");
  if (load) {
    orientedBox(ctx, x, y, dx, dy, 0.33, 0.14, 5, 8.5, load, shade(load, 1.2));
  }
}

// What the map is drawn with, and what is on it right now. The camera in a
// vehicle's window draws the same map a second time, around the vehicle.
export type MapView = { renderer: Renderer; scene: Scene };
