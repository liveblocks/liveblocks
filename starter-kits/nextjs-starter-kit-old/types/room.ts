import { UserInfo } from "../liveblocks.config";
import { DocumentRoomMetadata } from "./document";

/**
 * These types are used in the Liveblocks API
 * https://liveblocks.io/docs/api-reference/rest-api-endpoints
 */

export type Room = {
  type: "room";
  id: string;
  metadata: DocumentRoomMetadata;
  defaultAccesses: RoomAccess[];
  groupsAccesses: RoomAccesses;
  usersAccesses: RoomAccesses;
  draft: "yes" | "no";
  createdAt?: string;
  lastConnectionAt: string;
};

export enum RoomAccess {
  RoomWrite = "room:write",
  RoomRead = "room:read",
  RoomPresenceWrite = "room:presence:write",
}

export enum RoomAccessLevels {
  USER = "user",
  GROUP = "group",
  DEFAULT = "default",
}

export type RoomMetadata = Record<string, string | string[]>;

export type RoomAccesses = Record<string, RoomAccess[] | null>;

export type RoomActiveUser = {
  type: "user";
  id: string;
  connectionId: number;
  info: UserInfo;
};
