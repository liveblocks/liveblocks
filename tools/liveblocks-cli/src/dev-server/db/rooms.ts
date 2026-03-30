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

import type { JsonObject, Permission } from "@liveblocks/core";
import { nanoid, WebsocketCloseCodes } from "@liveblocks/core";
import type { Millis } from "@liveblocks/server";
import { DefaultMap, Room } from "@liveblocks/server";
import { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";

import { BunSQLiteDriver } from "./BunSQLiteDriver";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Static room config (permissions, metadata) stored in the central rooms DB.
 * Not to be confused with Room from @liveblocks/server, which is the live
 * runtime instance managing WebSocket sessions and storage.
 */
export type DbRoom = {
  id: string;
  internalId: string;
  organizationId: string;
  defaultAccesses: Permission[];
  usersAccesses: Record<string, Permission[]>;
  groupsAccesses: Record<string, Permission[]>;
  metadata: JsonObject;
  createdAt: string;
};

export type RoomMeta = string;
export type SessionMeta = never;
export type ClientMeta = JsonObject;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const DEFAULT_BASE_PATH = ".liveblocks/v1";
let basePath = DEFAULT_BASE_PATH;
let isEphemeral = false;
let _initializedDb: Database | null = null;

function roomsDir(): string {
  return join(basePath, "rooms");
}

function ensureInit(): void {
  if (_initializedDb) return;

  const dbPath = join(basePath, "db.sql");
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");

  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    room_id              TEXT NOT NULL PRIMARY KEY,
    internal_id          TEXT NOT NULL UNIQUE,
    organization_id      TEXT NOT NULL,
    default_permissions  TEXT NOT NULL,
    metadata             TEXT NOT NULL,
    created_at           TEXT NOT NULL
  ) STRICT`);

  db.run(`CREATE TABLE IF NOT EXISTS room_user_permissions (
    room_id  TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    scopes   TEXT NOT NULL,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
  ) STRICT`);

  db.run(`CREATE TABLE IF NOT EXISTS room_group_permissions (
    room_id   TEXT NOT NULL,
    group_id  TEXT NOT NULL,
    scopes    TEXT NOT NULL,
    PRIMARY KEY (room_id, group_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
  ) STRICT`);

  _initializedDb = db;
}

function getDb(): Database {
  if (!_initializedDb) throw new Error("Rooms DB not initialized");
  return _initializedDb;
}

// ---------------------------------------------------------------------------
// Internal SQL helpers
// ---------------------------------------------------------------------------

type RoomRow = {
  room_id: string;
  internal_id: string;
  organization_id: string;
  default_permissions: string;
  metadata: string;
  created_at: string;
};

type PermissionRow = {
  room_id: string;
  user_id?: string;
  group_id?: string;
  scopes: string;
};

function formatRoom(row: RoomRow): DbRoom {
  const db = getDb();

  const userPerms = db
    .query<
      PermissionRow,
      [string]
    >("SELECT user_id, scopes FROM room_user_permissions WHERE room_id = ?")
    .all(row.room_id);

  const groupPerms = db
    .query<
      PermissionRow,
      [string]
    >("SELECT group_id, scopes FROM room_group_permissions WHERE room_id = ?")
    .all(row.room_id);

  const usersAccesses: Record<string, Permission[]> = {};
  for (const r of userPerms) {
    usersAccesses[r.user_id!] = JSON.parse(r.scopes) as Permission[];
  }

  const groupsAccesses: Record<string, Permission[]> = {};
  for (const r of groupPerms) {
    groupsAccesses[r.group_id!] = JSON.parse(r.scopes) as Permission[];
  }

  return {
    id: row.room_id,
    internalId: row.internal_id,
    organizationId: row.organization_id,
    defaultAccesses: JSON.parse(row.default_permissions) as Permission[],
    usersAccesses,
    groupsAccesses,
    metadata: JSON.parse(row.metadata) as JsonObject,
    createdAt: row.created_at,
  };
}

function getDbRoom(roomId: string): DbRoom | undefined {
  const row = getDb()
    .query<
      RoomRow,
      [string]
    >("SELECT room_id, internal_id, organization_id, default_permissions, metadata, created_at FROM rooms WHERE room_id = ?")
    .get(roomId);
  if (!row) return undefined;
  return formatRoom(row);
}

const DEFAULT_ORGANIZATION_ID = "default";

function createDbRoom(
  roomId: string,
  opts?: {
    organizationId?: string;
    defaultAccesses?: Permission[];
    metadata?: JsonObject;
    usersAccesses?: Record<string, Permission[]>;
    groupsAccesses?: Record<string, Permission[]>;
  }
): DbRoom {
  const db = getDb();
  const internalId = nanoid();
  const now = new Date().toISOString();
  const organizationId = opts?.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const defaultAccesses = opts?.defaultAccesses ?? ["room:write"];
  const metadata = opts?.metadata ?? {};

  db.run(
    "INSERT INTO rooms (room_id, internal_id, organization_id, default_permissions, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      roomId,
      internalId,
      organizationId,
      JSON.stringify(defaultAccesses),
      JSON.stringify(metadata),
      now,
    ]
  );

  if (opts?.usersAccesses) {
    for (const [userId, scopes] of Object.entries(opts.usersAccesses)) {
      db.run(
        "INSERT INTO room_user_permissions (room_id, user_id, scopes) VALUES (?, ?, ?)",
        [roomId, userId, JSON.stringify(scopes)]
      );
    }
  }

  if (opts?.groupsAccesses) {
    for (const [groupId, scopes] of Object.entries(opts.groupsAccesses)) {
      db.run(
        "INSERT INTO room_group_permissions (room_id, group_id, scopes) VALUES (?, ?, ?)",
        [roomId, groupId, JSON.stringify(scopes)]
      );
    }
  }

  return {
    id: roomId,
    internalId,
    organizationId,
    defaultAccesses: defaultAccesses as Permission[],
    usersAccesses: opts?.usersAccesses ?? {},
    groupsAccesses: opts?.groupsAccesses ?? {},
    metadata,
    createdAt: now,
  };
}

function updateDbRoom(
  roomId: string,
  patch: {
    defaultAccesses?: Permission[];
    metadata?: JsonObject;
    usersAccesses?: Record<string, Permission[] | null>;
    groupsAccesses?: Record<string, Permission[] | null>;
  }
): DbRoom | undefined {
  const db = getDb();
  const existing = getDbRoom(roomId);
  if (!existing) return undefined;

  if (patch.defaultAccesses !== undefined) {
    db.run("UPDATE rooms SET default_permissions = ? WHERE room_id = ?", [
      JSON.stringify(patch.defaultAccesses),
      roomId,
    ]);
  }

  if (patch.metadata !== undefined) {
    const merged = { ...existing.metadata, ...patch.metadata };
    db.run("UPDATE rooms SET metadata = ? WHERE room_id = ?", [
      JSON.stringify(merged),
      roomId,
    ]);
  }

  if (patch.usersAccesses !== undefined) {
    for (const [userId, scopes] of Object.entries(patch.usersAccesses)) {
      if (scopes === null) {
        db.run(
          "DELETE FROM room_user_permissions WHERE room_id = ? AND user_id = ?",
          [roomId, userId]
        );
      } else {
        db.run(
          `INSERT INTO room_user_permissions (room_id, user_id, scopes) VALUES (?, ?, ?)
           ON CONFLICT (room_id, user_id) DO UPDATE SET scopes = ?`,
          [roomId, userId, JSON.stringify(scopes), JSON.stringify(scopes)]
        );
      }
    }
  }

  if (patch.groupsAccesses !== undefined) {
    for (const [groupId, scopes] of Object.entries(patch.groupsAccesses)) {
      if (scopes === null) {
        db.run(
          "DELETE FROM room_group_permissions WHERE room_id = ? AND group_id = ?",
          [roomId, groupId]
        );
      } else {
        db.run(
          `INSERT INTO room_group_permissions (room_id, group_id, scopes) VALUES (?, ?, ?)
           ON CONFLICT (room_id, group_id) DO UPDATE SET scopes = ?`,
          [roomId, groupId, JSON.stringify(scopes), JSON.stringify(scopes)]
        );
      }
    }
  }

  return getDbRoom(roomId);
}

function deleteDbRoom(roomId: string): void {
  getDb().run("DELETE FROM rooms WHERE room_id = ?", [roomId]);
}

// ---------------------------------------------------------------------------
// Room instances (in-memory Room objects backed by per-room storage files)
// ---------------------------------------------------------------------------

function getStoragePath(internalId: string): string {
  const dir = roomsDir();
  const resolved = resolve(dir, `${internalId}.sql`);
  if (!resolved.startsWith(resolve(dir) + "/")) {
    throw new Error("Invalid internal ID");
  }
  return resolved;
}

const instances = new DefaultMap<
  string,
  Room<RoomMeta, SessionMeta, ClientMeta>
>((roomId) => {
  const record = getDbRoom(roomId) ?? createDbRoom(roomId);

  mkdirSync(roomsDir(), { recursive: true });
  const storage = new BunSQLiteDriver(getStoragePath(record.internalId));
  const room = new Room<RoomMeta, SessionMeta, ClientMeta>(roomId, {
    storage,
  });
  return room;
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Switch to ephemeral (temp dir) storage. Returns the root temp directory.
 * Room data is stored in a `data/` subdirectory so that sibling files
 * (e.g. server.log) survive cleanup.
 */
export function useEphemeralStorage(): string {
  const root = mkdtempSync(join(tmpdir(), "liveblocks-dev-"));
  basePath = join(root, "data");
  isEphemeral = true;
  return root;
}

/**
 * Get a room record from the DB. Returns undefined if not found.
 */
export function getRoom(roomId: string): DbRoom | undefined {
  ensureInit();
  return getDbRoom(roomId);
}

/**
 * Get a room record, creating one (with DB row + storage file) if it
 * doesn't exist yet. Accepts optional overrides only used on creation.
 */
export function getOrCreateRoom(
  roomId: string,
  opts?: {
    organizationId?: string;
    defaultAccesses?: Permission[];
    metadata?: JsonObject;
    usersAccesses?: Record<string, Permission[]>;
    groupsAccesses?: Record<string, Permission[]>;
  }
): DbRoom {
  ensureInit();
  const existing = getDbRoom(roomId);
  if (existing) return existing;

  const record = createDbRoom(roomId, opts);
  // Ensure the storage file is created via the Room instance
  instances.getOrCreate(roomId);
  return record;
}

export type RoomFilters = {
  organizationId?: string;
  roomId?: { value: string; operator: "^" };
  metadata?: Record<string, string>;
};

/**
 * List all room records, optionally filtered by metadata and/or roomId prefix.
 */
export function listRooms(filters?: RoomFilters): DbRoom[] {
  ensureInit();

  const db = getDb();
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.organizationId) {
    conditions.push("organization_id = ?");
    params.push(filters.organizationId);
  }

  if (filters?.roomId) {
    // Only prefix operator is supported
    conditions.push("room_id LIKE ? ESCAPE '\\'");
    // Escape any existing % or _ in the prefix, then append %
    const escaped = filters.roomId.value.replace(/[%_\\]/g, "\\$&");
    params.push(`${escaped}%`);
  }

  if (filters?.metadata) {
    for (const [key, value] of Object.entries(filters.metadata)) {
      conditions.push("JSON_EXTRACT(metadata, ?) = ?");
      params.push(`$.${JSON.stringify(key)}`, value);
    }
  }

  const where =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .query<RoomRow, string[]>(
      `SELECT room_id, internal_id, organization_id, default_permissions, metadata, created_at
       FROM rooms
       ${where}`
    )
    .all(...params);

  return rows.map(formatRoom);
}

/**
 * Update a room's metadata/permissions in the DB.
 */
export function updateRoom(
  roomId: string,
  patch: {
    defaultAccesses?: Permission[];
    metadata?: JsonObject;
    usersAccesses?: Record<string, Permission[] | null>;
    groupsAccesses?: Record<string, Permission[] | null>;
  }
): DbRoom | undefined {
  ensureInit();
  return updateDbRoom(roomId, patch);
}

/**
 * Delete a room: remove from DB (CASCADE) and delete storage file.
 */
export async function deleteRoom(roomId: string): Promise<void> {
  ensureInit();
  const record = getDbRoom(roomId);

  const room = instances.get(roomId);
  if (room) {
    room.endSessionBy(
      () => true,
      WebsocketCloseCodes.KICKED,
      "Deliberately disconnected"
    );
    room.unload();
    (room.driver as BunSQLiteDriver).close();
    instances.delete(roomId);
  }

  if (record) {
    const path = getStoragePath(record.internalId);
    try {
      await Bun.write(path, "");
      await Bun.file(path).unlink();
    } catch {
      // File might not exist, ignore
    }

    deleteDbRoom(roomId);
  }
}

/**
 * Get the in-memory Room instance for managing real-time sessions (WebSocket
 * connections, presence, storage operations). Creates the DB record + storage
 * file if the room doesn't exist yet.
 */
export function getRoomInstance(
  roomId: string
): Room<RoomMeta, SessionMeta, ClientMeta> {
  ensureInit();
  return instances.getOrCreate(roomId);
}

let globalMaintenanceUntil: Promise<void> | null = null;

/**
 * Enter maintenance mode on all active rooms. Each room's
 * runInMaintenanceMode will hold until `until` resolves
 * (i.e. when 'm' is pressed again).
 */
export function enterGlobalMaintenance(until: Promise<void>): void {
  globalMaintenanceUntil = until;
  for (const room of instances.values()) {
    void room
      .runInMaintenanceMode(() => until)
      .catch(() => {
        // Room was already in maintenance (E_ALREADY_LOCKED), skip
      });
  }
  void until.then(() => {
    globalMaintenanceUntil = null;
  });
}

/**
 * Returns true if a room should refuse new connections.
 */
export function shouldRefuseConnection(roomId: string): boolean {
  if (globalMaintenanceUntil !== null) return true;
  const room = instances.get(roomId);
  return room !== undefined && room.isInMaintenance;
}

export type ActiveConnection = {
  roomId: string;
  actor: number;
  userId: string | undefined;
  connectedAt: Millis;
  lastActiveAt: Millis;
};

/**
 * Returns a flat list of all active connections across all rooms.
 */
export function listActiveConnections(): ActiveConnection[] {
  const result: ActiveConnection[] = [];
  for (const [roomId, room] of instances) {
    for (const session of room.listSessions()) {
      result.push({
        roomId,
        actor: session.actor,
        userId: session.user.id ?? session.user.anonymousId,
        connectedAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
      });
    }
  }
  return result;
}

/**
 * Kill a specific connection by room ID and actor.
 */
export function killConnection(roomId: string, actor: number): boolean {
  const room = instances.get(roomId);
  if (!room) return false;
  return (
    room.endSessionBy(
      (session) => session.actor === actor,
      WebsocketCloseCodes.KICKED,
      "Deliberately disconnected"
    ) > 0
  );
}

/**
 * Unload all room instances but keep files on disk.
 */
export function unloadAll(): void {
  for (const room of instances.values()) {
    room.unload();
  }
  instances.clear();
}

/**
 * Unload all room instances and, if ephemeral, remove the temp directory.
 */
export function cleanup(): void {
  for (const room of instances.values()) {
    room.unload();
    (room.driver as BunSQLiteDriver).close();
  }
  instances.clear();

  if (_initializedDb) {
    _initializedDb.close();
    _initializedDb = null;
  }

  if (isEphemeral) {
    rmSync(basePath, { recursive: true, force: true });
  }
}
