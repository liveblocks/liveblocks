import type { FurnitureType } from "./catalog";

/**
 * The shapes stored in Liveblocks Storage. Every length is in centimeters, in
 * plan coordinates (x to the right, y down), so the plan is independent of
 * anyone's zoom level or display units.
 */

export type Point = { x: number; y: number };

// A corner of a room. Its id also names the wall that starts at this corner
// and runs to the next one, so doors and windows can stay attached to a wall
// while corners are added, moved, or removed around it.
export type Corner = { id: string; x: number; y: number };

export type FloorFinish = "none" | "wood" | "tile" | "carpet";

export type Room = {
  id: string;
  name: string;
  floor: FloorFinish;
  // The room outline, in order. Replaced as a whole on every edit, so a room
  // never ends up with half of one person's shape and half of another's.
  points: readonly Corner[];
};

// The same room as it's written to Storage (which wants a plain array).
export type RoomLson = Omit<Room, "points"> & { points: Corner[] };

export type DoorStyle = "single" | "double" | "sliding" | "archway";

export type Opening = {
  id: string;
  kind: "door" | "window";
  // How a door is drawn. Ignored for windows.
  style: DoorStyle;
  // The wall this opening sits in: a room, and the corner its wall starts at.
  roomId: string;
  wallId: string;
  // Distance from the start of the wall to the middle of the opening.
  offset: number;
  width: number;
  // Which end of the opening a door is hinged on, and whether it swings into
  // the room or out of it.
  hinge: "start" | "end";
  swing: "in" | "out";
};

export type Furniture = {
  id: string;
  type: FurnitureType;
  // Center of the piece.
  x: number;
  y: number;
  // Degrees, clockwise. At 0 the back of the piece faces the top of the plan.
  rotation: number;
  width: number;
  depth: number;
  // Stacking order among furniture; higher is drawn on top.
  z: number;
};

export type Selection = {
  kind: "room" | "opening" | "furniture";
  id: string;
};

export type Tool = "select" | "room" | "door" | "window";

export type PlanData = {
  rooms: Room[];
  openings: Opening[];
  furniture: Furniture[];
};

export function isSameSelection(a: Selection | null, b: Selection | null) {
  return a === b || (!!a && !!b && a.kind === b.kind && a.id === b.id);
}

export const DOOR_STYLES: { id: DoorStyle; label: string }[] = [
  { id: "single", label: "Single" },
  { id: "double", label: "Double" },
  { id: "sliding", label: "Sliding" },
  { id: "archway", label: "Archway" },
];

export const FLOOR_FINISHES: { id: FloorFinish; label: string }[] = [
  { id: "none", label: "Plain" },
  { id: "wood", label: "Wood" },
  { id: "tile", label: "Tile" },
  { id: "carpet", label: "Carpet" },
];

export const ROOM_NAMES = [
  "Living room",
  "Kitchen",
  "Dining room",
  "Bedroom",
  "Bathroom",
  "Entry",
  "Hallway",
  "Office",
  "Closet",
  "Laundry",
  "Balcony",
];
