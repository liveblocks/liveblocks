import type { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  Furniture,
  Opening,
  Point,
  RoomLson,
  Selection,
} from "./lib/plan";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        // Used for this person's cursor and selection outlines.
        color: string;
        title: string;
      };
    };

    // Realtime presence, shared with everyone on the plan.
    Presence: {
      // Where this person's pointer is, in plan coordinates (centimeters),
      // so it lands on the same spot whatever each person's zoom is.
      cursor: Point | null;
      // What this person has selected, outlined for everyone else.
      selection: Selection | null;
    };

    // The floor plan. Rooms, openings (doors and windows) and furniture each
    // live in their own LiveMap of LiveObjects, so two people editing
    // different things, or different properties of the same thing, never
    // overwrite each other. See `lib/plan.ts` for the shapes.
    Storage: {
      rooms: LiveMap<string, LiveObject<RoomLson>>;
      openings: LiveMap<string, LiveObject<Opening>>;
      furniture: LiveMap<string, LiveObject<Furniture>>;
    };
  }
}

export {};
