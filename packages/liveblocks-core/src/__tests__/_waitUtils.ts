import type { Status } from "../connection";
import { wait, withTimeout } from "../lib/utils";
import type { OpaqueRoom } from "../room";

export async function waitFor(predicate: () => boolean): Promise<void> {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < 2000) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error("TIMEOUT");
}

/**
 * Handy helper that allows to pause test execution until the room has
 * asynchronously reached a particular status. Status must be reached within
 * a limited time window, or else this will fail, to avoid hanging.
 */
export async function waitUntilStatus(
  room: OpaqueRoom,
  targetStatus: Status,
  timeout = 1000
): Promise<void> {
  if (room.getStatus() === targetStatus) {
    return;
  }

  await withTimeout(
    room.events.status.waitUntil((status) => status === targetStatus),
    timeout,
    `Room did not reach connection status "${targetStatus}" within ${
      timeout / 1000
    }s`
  );
}

export async function waitUntilOthersEvent(room: OpaqueRoom): Promise<void> {
  await withTimeout(
    room.events.others.waitUntil(),
    1000,
    'Room never got an "others" update within 1s'
  );
}

export async function waitUntilCustomEvent(room: OpaqueRoom): Promise<void> {
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
export async function waitUntilSynchronized(room: OpaqueRoom): Promise<void> {
  if (room.getStorageStatus() === "synchronized") {
    return;
  }

  await withTimeout(
    room.events.storageStatus.waitUntil((status) => status === "synchronized"),
    1000,
    'Room did not reach "synchronized" storage status within 1s'
  );
}

export async function waitUntilStorageUpdate(room: OpaqueRoom): Promise<void> {
  await withTimeout(
    room.events.storageBatch.waitUntil(),
    1000,
    "Room never received a storage update within 1s"
  );
}
