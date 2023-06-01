import type { LsonObject } from "../crdts/Lson";
import { withTimeout } from "../lib/fsm";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { ConnectionStatus, Room } from "../room";

/**
 * Handy helper that allows to pause test execution until the room has
 * asynchronously reached a particular status. Status must be reached within
 * a limited time window, or else this will fail, to avoid hanging.
 */
export async function waitUntilStatus(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
  targetStatus: ConnectionStatus
): Promise<void> {
  if (room.getConnectionState() === targetStatus) {
    return;
  }

  await withTimeout(
    room.events.connection.waitUntil((status) => status === targetStatus),
    1000,
    `Room did not reach connection status "${targetStatus}" within 1s`
  );
}

export async function waitUntilOthersEvent(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): Promise<void> {
  await withTimeout(
    room.events.others.waitUntil(),
    1000,
    'Room never got an "others" update within 1s'
  );
}

export async function waitUntilCustomEvent(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): Promise<void> {
  await withTimeout(
    room.events.customEvent.waitUntil(),
    1000,
    "Room never got a custom broadcast event within 1s"
  );
}

/**
 * Handy helper that allows to pause test execution until the room has
 * synchronized all pending changes to the server.
 */
export async function waitUntilSynchronized(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): Promise<void> {
  if (room.getStorageStatus() === "synchronized") {
    return;
  }

  await withTimeout(
    room.events.storageStatus.waitUntil((status) => status === "synchronized"),
    1000,
    'Room did not reach "synchronized" storage status within 1s'
  );
}

export async function waitUntilStorageUpdate(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): Promise<void> {
  await withTimeout(
    room.events.storage.waitUntil(),
    1000,
    "Room never received a storage update within 1s"
  );
}
