import type {
  Json,
  JsonObject,
  LiveList,
  LiveMap,
  LiveObject,
} from "@liveblocks/client";

/**
 * The shared part of one AG Studio page. Widgets and their layout entries are
 * stored in LiveMaps keyed by widget id, so every widget syncs independently:
 * two people editing different widgets never overwrite each other.
 */
export type StoredPage = LiveObject<{
  // Widget definitions (type, data mapping, options), keyed by widget id
  widgets: LiveMap<string, Json>;
  // Widget positions and sizes in the canvas grid, keyed by widget id
  widgetLayout: LiveMap<string, Json>;
  // The remaining shared page state: page layout, filters, cross-filter and
  // schema. Per-user UI state (the active selection) is deliberately not
  // stored here — see report-sync.ts.
  rest: JsonObject;
}>;

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        avatar: string;
        color: string;
      };
    };

    // No custom presence is needed: who is in the room (for the avatar stack)
    // comes from the connection itself.
    Presence: Record<string, never>;

    // The shared AG Studio report. `selectedPageId` and `panels` from AG
    // Studio's state object are intentionally NOT stored: which page you look
    // at and how your sidebars are arranged stay local to each user.
    Storage: {
      // AG Studio version that created the report, letting AG Studio migrate
      // saved state across breaking releases
      version: string | null;
      // Page tab order, as page ids
      pageOrder: LiveList<string>;
      // Shared page state, keyed by page id
      pages: LiveMap<string, StoredPage>;
    };
  }
}

export {};
