import { LiveMap, LiveObject } from "@liveblocks/client";
import { getCatalogItem, type FurnitureType } from "./catalog";
import type {
  Corner,
  DoorStyle,
  FloorFinish,
  Furniture,
  Opening,
  PlanData,
  Room,
} from "./plan";

/**
 * The plans people can switch between. Each one is its own Liveblocks room,
 * seeded with a template the first time anyone opens it.
 */
export type PlanId = "apartment" | "studio" | "blank";

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
};

export const PLANS: Plan[] = [
  {
    id: "apartment",
    name: "One-bedroom apartment",
    description: "Five rooms, furnished",
  },
  { id: "studio", name: "Studio", description: "Open plan, furnished" },
  { id: "blank", name: "Blank plan", description: "Start from scratch" },
];

export const DEFAULT_PLAN_ID: PlanId = "apartment";

export function getPlan(id: PlanId) {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

/**
 * Small helpers to write a template by hand. All numbers are centimeters.
 * Walls are named after the corner they start at; an opening's `offset` is
 * measured along its wall from that corner.
 */
function builder() {
  const data: PlanData = { rooms: [], openings: [], furniture: [] };

  return {
    data,

    // A room from a list of corners, in clockwise order. Corners (and so
    // walls) get the ids `<id>-a`, `<id>-b`, …
    room(
      id: string,
      name: string,
      floor: FloorFinish,
      corners: [x: number, y: number][]
    ) {
      const points: Corner[] = corners.map(([x, y], index) => ({
        id: `${id}-${String.fromCharCode(97 + index)}`,
        x,
        y,
      }));
      data.rooms.push({ id, name, floor, points });
    },

    // A rectangular room. Its walls are `-a` (top, left to right), `-b`
    // (right, top to bottom), `-c` (bottom, right to left) and `-d` (left,
    // bottom to top).
    rect(
      id: string,
      name: string,
      floor: FloorFinish,
      x: number,
      y: number,
      width: number,
      depth: number
    ) {
      this.room(id, name, floor, [
        [x, y],
        [x + width, y],
        [x + width, y + depth],
        [x, y + depth],
      ]);
    },

    window(wallId: string, offset: number, width: number) {
      data.openings.push({
        id: `window-${data.openings.length + 1}`,
        kind: "window",
        style: "single",
        roomId: wallId.slice(0, wallId.lastIndexOf("-")),
        wallId,
        offset,
        width,
        hinge: "start",
        swing: "in",
      });
    },

    door(
      wallId: string,
      offset: number,
      width: number,
      style: DoorStyle = "single",
      options: Partial<Pick<Opening, "hinge" | "swing">> = {}
    ) {
      data.openings.push({
        id: `door-${data.openings.length + 1}`,
        kind: "door",
        style,
        roomId: wallId.slice(0, wallId.lastIndexOf("-")),
        wallId,
        offset,
        width,
        hinge: options.hinge ?? "start",
        swing: options.swing ?? "in",
      });
    },

    // A piece of furniture centered on (x, y). At rotation 0 its back faces
    // the top of the plan; 90 turns it to face the right, and so on.
    add(
      type: FurnitureType,
      x: number,
      y: number,
      rotation = 0,
      size: Partial<Pick<Furniture, "width" | "depth">> = {}
    ) {
      const z = data.furniture.length + 1;
      data.furniture.push({
        id: `${type}-${z}`,
        type,
        x,
        y,
        rotation,
        width: size.width ?? getCatalogItem(type)?.width ?? 100,
        depth: size.depth ?? getCatalogItem(type)?.depth ?? 100,
        z,
      });
    },
  };
}

function apartment(): PlanData {
  const plan = builder();

  // An L-shaped living room that wraps around the kitchen.
  plan.room("living", "Living room", "wood", [
    [0, 0],
    [620, 0],
    [620, 300],
    [960, 300],
    [960, 560],
    [0, 560],
  ]);
  plan.rect("kitchen", "Kitchen", "tile", 620, 0, 340, 300);
  plan.rect("bedroom", "Bedroom", "carpet", 0, 560, 480, 380);
  plan.rect("bathroom", "Bathroom", "tile", 480, 560, 260, 260);
  plan.rect("entry", "Entry", "wood", 740, 560, 220, 260);

  plan.window("living-a", 180, 150);
  plan.window("living-a", 440, 150);
  plan.window("living-f", 130, 160);
  plan.window("living-d", 130, 140);
  plan.window("kitchen-a", 170, 120);
  plan.window("bedroom-c", 240, 180);
  plan.window("bathroom-c", 150, 60);

  plan.door("kitchen-c", 190, 180, "archway");
  plan.door("living-e", 560, 80, "single", { swing: "out" });
  plan.door("entry-a", 110, 120, "archway");
  plan.door("entry-b", 170, 90);
  plan.door("bathroom-b", 200, 75, "single", { hinge: "end" });

  // Living area
  plan.add("rug", 230, 150);
  plan.add("sofa", 54, 150, 270);
  plan.add("coffee-table", 190, 150, 90);
  plan.add("tv-unit", 594, 150, 90);
  plan.add("armchair", 300, 262, 180);
  plan.add("floor-lamp", 366, 284);
  plan.add("side-table", 36, 290);
  plan.add("plant", 584, 36);
  plan.add("bookshelf", 540, 537, 180);
  plan.add("dining-table", 170, 435);

  // Desk nook
  plan.add("desk", 919, 430, 90);
  plan.add("office-chair", 850, 430, 270);
  plan.add("plant", 928, 332);

  // Kitchen
  plan.add("fridge", 661, 41);
  plan.add("counter", 723, 36, 0, { width: 54 });
  plan.add("sink", 790, 36);
  plan.add("stove", 860, 36);
  plan.add("counter", 922, 36, 0, { width: 64 });
  plan.add("counter", 924, 126, 90);
  plan.add("island", 770, 185, 0, { width: 140, depth: 70 });
  plan.add("bar-stool", 735, 246);
  plan.add("bar-stool", 805, 246);

  // Bedroom
  plan.add("rug", 250, 760, 90);
  plan.add("bed-double", 106, 760, 270);
  plan.add("nightstand", 26, 655, 270);
  plan.add("nightstand", 26, 865, 270);
  plan.add("wardrobe", 444, 800, 90);
  plan.add("dresser", 200, 591);

  // Bathroom
  plan.add("bathtub", 571, 604);
  plan.add("washer", 704, 596);
  plan.add("toilet", 521, 720, 270);
  plan.add("vanity", 590, 789, 180);

  // Entry
  plan.add("wardrobe", 806, 786, 180, { width: 100, depth: 55 });

  return plan.data;
}

function studio(): PlanData {
  const plan = builder();

  plan.room("studio", "Studio", "wood", [
    [0, 0],
    [520, 0],
    [520, 220],
    [760, 220],
    [760, 500],
    [0, 500],
  ]);
  plan.rect("bathroom", "Bathroom", "tile", 520, 0, 240, 220);

  plan.window("studio-a", 370, 200);
  plan.window("studio-f", 200, 180);
  plan.window("bathroom-a", 120, 60);

  plan.door("studio-d", 90, 90);
  plan.door("bathroom-c", 70, 70);

  // Sleeping area
  plan.add("bed-double", 96, 106);
  plan.add("nightstand", 204, 26);
  plan.add("wardrobe", 484, 110, 90, { width: 140 });

  // Living area
  plan.add("rug", 120, 385);
  plan.add("tv-unit", 120, 250);
  plan.add("loveseat", 120, 449, 180);
  plan.add("coffee-table", 120, 360);
  plan.add("round-table", 350, 330);
  plan.add("plant", 548, 252);

  // Kitchenette, along the bottom wall
  plan.add("counter", 494, 464, 180, { width: 100 });
  plan.add("sink", 584, 464, 180);
  plan.add("stove", 654, 464, 180);
  plan.add("fridge", 719, 459, 180);

  // Bathroom
  plan.add("shower", 571, 51);
  plan.add("toilet", 660, 41);
  plan.add("vanity", 729, 60, 90);

  return plan.data;
}

export function getTemplate(planId: PlanId): PlanData {
  switch (planId) {
    case "apartment":
      return apartment();
    case "studio":
      return studio();
    case "blank":
      return { rooms: [], openings: [], furniture: [] };
  }
}

export function toLiveRoom(room: Room) {
  return new LiveObject({ ...room, points: [...room.points] });
}

/** The Storage a plan's room starts with, the first time it's opened. */
export function createInitialStorage(planId: PlanId): Liveblocks["Storage"] {
  const template = getTemplate(planId);
  return {
    rooms: new LiveMap(
      template.rooms.map((room) => [room.id, toLiveRoom(room)])
    ),
    openings: new LiveMap(
      template.openings.map((opening) => [opening.id, new LiveObject(opening)])
    ),
    furniture: new LiveMap(
      template.furniture.map((item) => [item.id, new LiveObject(item)])
    ),
  };
}
