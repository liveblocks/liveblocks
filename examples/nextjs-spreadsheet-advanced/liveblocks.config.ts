import {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
} from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
export type Presence = {
  selectedCell: string | null;
};

export type Column = {
  id: string;
  width: number;
};

export type Row = {
  id: string;
  height: number;
};

export type CellData = {
  value: string;
};

// Storage represents the shared document that persists in the Room, even after
// all Users leave. Fields under Storage typically are LiveList, LiveMap,
// LiveObject instances, for which updates are automatically persisted and
// synced to all connected clients.
export type Storage = {
  spreadsheet: LiveObject<{
    cells: LiveMap<string, LiveObject<CellData>>;
    rows: LiveList<LiveObject<Row>>;
    columns: LiveList<LiveObject<Column>>;
  }>;
};

const {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
  useObject,
  useSelf,
  useList,
  useMap,
  useRoom,
} = createRoomContext<Presence, Storage /*, UserMeta, RoomEvent */>(client);

export {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
  useObject,
  useSelf,
  useList,
  useMap,
  useRoom,
};
