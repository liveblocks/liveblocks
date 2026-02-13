/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { JsonObject, PlainLsonObject } from "@liveblocks/core";
import { DefaultMap, Room } from "@liveblocks/server";
import { mkdirSync, readdirSync } from "fs";
import { resolve } from "path";

import { BunSQLiteDriver } from "../plugins/BunSQLiteDriver";

const DB_PATH = ".liveblocks/v1/rooms";

export type RoomMeta = string; // Room metadata: just use the room ID
export type SessionMeta = never;
export type ClientMeta = JsonObject; // Public session metadata, sent to clients in ROOM_STATE

// Stores a list of all "loaded room instances"
const instances = new DefaultMap<
  string,
  Room<RoomMeta, SessionMeta, ClientMeta>
>((roomId) => {
  mkdirSync(DB_PATH, { recursive: true });
  const storage = new BunSQLiteDriver(getSqlitePath(roomId));
  const room = new Room<RoomMeta, SessionMeta, ClientMeta>(roomId, {
    storage,
    // hooks: {
    //   onSessionDidStart(session) {
    //     const numSessions = room.numSessions;
    //     console.log(`Users in room: ${numSessions - 1} → ${numSessions}`);
    //   },
    //
    //   onSessionDidEnd(session) {
    //     const numSessions = room.numSessions;
    //     console.log(`Users in room: ${numSessions + 1} → ${numSessions}`);
    //   },
    // },
  });
  return room;
});

function getSqlitePath(roomId: string): string {
  const resolved = resolve(DB_PATH, `${encodeURIComponent(roomId)}.db`);
  if (!resolved.startsWith(resolve(DB_PATH) + "/")) {
    throw new Error("Invalid room ID");
  }
  return resolved;
}

/**
 * Get or create a room instance by ID.
 */
export function getOrCreate(
  roomId: string
): Room<RoomMeta, SessionMeta, ClientMeta> {
  return instances.getOrCreate(roomId);
}

/**
 * Check if a room exists by checking if its database file exists.
 */
export async function exists(roomId: string): Promise<boolean> {
  const dbPath = getSqlitePath(roomId);
  const file = Bun.file(dbPath);
  return await file.exists();
}

/**
 * Get all room IDs by scanning the directory for .db files.
 */
export function getAll(): string[] {
  try {
    mkdirSync(DB_PATH, { recursive: true });
    const files = readdirSync(DB_PATH);
    const roomIds = files
      .filter((file) => file.endsWith(".db"))
      .map((file) => decodeURIComponent(file.replace(/\.db$/, "")));
    return roomIds;
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Create a room with empty storage.
 */
export async function create(roomId: string): Promise<void> {
  if (await exists(roomId)) {
    throw new Error(`Room with id "${roomId}" already exists`);
  }

  const room = instances.getOrCreate(roomId);
  await room.load();

  // Initialize empty storage
  const emptyStorage: PlainLsonObject = {
    liveblocksType: "LiveObject",
    data: {},
  };
  await room.driver.DANGEROUSLY_reset_nodes(emptyStorage);
  room.unload();
}

/**
 * Delete a room by removing its database file.
 */
export async function remove(roomId: string): Promise<void> {
  const path = getSqlitePath(roomId);
  try {
    await Bun.write(path, ""); // Clear the file
    await Bun.file(path).unlink(); // Delete the file
  } catch (error) {
    // File might not exist, ignore
  }
}
