import type { LsonObject } from "../crdts/Lson";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { Room } from "../room";
import { activateBridge, onMessageFromPanel, sendToPanel } from "./bridge";

let _devtoolsSetupHasRun = false;

/**
 * Sends a wake up message to the devtools panel, if any such panel exists, and
 * listens for the initial connect message, which would be the trigger to start
 * emitting updates.
 *
 * Must be called before linkDevtools() can be used.
 *
 * Will only run once, even when called multiple times.
 */
export function setupDevtools(getAllRooms: () => string[]): void {
  // Define it as a no-op in production environments or when run outside of a browser context
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  if (_devtoolsSetupHasRun) {
    // This setup code should only happen the first time
    return;
  }

  _devtoolsSetupHasRun = true;

  onMessageFromPanel.subscribe((msg) => {
    switch (msg.msg) {
      // When a devtool panel sends an explicit "connect" message back to this
      // live running client (in response to the "wake-up-devtools" message,
      // or when the devtool panel is opened for the first time), it means that it's okay to
      // start emitting messages.
      // Before this explicit acknowledgement, any call to sendToPanel() will
      // be a no-op.
      case "connect": {
        // Allows future sendToPanel() messages to go through
        activateBridge(true);

        // Emit an explicit "room::available" message for every known room at
        // this point. These can be used by the devpanel to subscribe to such
        // room's updates.
        for (const roomId of getAllRooms()) {
          sendToPanel({ msg: "room::available", roomId });
        }

        break;
      }

      // TODO: Later on, we can support explicit disconnects, too
      // case "disconnect": {
      //   // Make sendToPanel() no-ops again
      //   activateBridge(false);
      //   break;
      // }
    }
  });

  // Send initial wake up message, in case the devtool panel is already open!
  sendToPanel({ msg: "wake-up-devtools" }, { force: true });
}

const unsubsByRoomId = new Map<string, (() => void)[]>();

function stopSyncStream(roomId: string): void {
  const unsubs = unsubsByRoomId.get(roomId) ?? [];
  unsubsByRoomId.delete(roomId); // Pop it off

  for (const unsub of unsubs) {
    // Cancel all of the subscriptions to room updates that are synchronizing
    // partial state to the devtools panel
    unsub();
  }
}

/**
 * Starts, or restarts, the stream of sync messages for the given room. A sync
 * stream consists of an initial "full sync" message, followed by many
 * "partial" messages that happen whenever part of the room changes.
 */
function startSyncStream(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): void {
  stopSyncStream(room.id);

  // Sync the room ID instantly, as soon as we know it
  fullSync(room);

  unsubsByRoomId.set(room.id, [
    // When storage initializes, send the update
    room.events.storageDidLoad.subscribeOnce(() => partialSyncStorage(room)),

    // Any time storage updates, send the new storage root
    room.events.storage.subscribe(() => partialSyncStorage(room)),

    // Any time "me" or "others" updates, send the new values accordingly
    room.events.me.subscribe(() => partialSyncMe(room)),
    room.events.others.subscribe(() => partialSyncOthers(room)),
  ]);
}

function partialSyncStorage(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
) {
  const root = room.getStorageSnapshot();
  if (root) {
    sendToPanel({
      msg: "room::sync::partial",
      roomId: room.id,
      storage: root.toStorageTreeNode("root").children,
    });
  }
}

function partialSyncMe(room: Room<JsonObject, LsonObject, BaseUserMeta, Json>) {
  const me = room.getSelfAsTreeNode();
  if (me) {
    sendToPanel({
      msg: "room::sync::partial",
      roomId: room.id,
      me,
    });
  }
}

function partialSyncOthers(
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
) {
  // Any time others updates, send the new storage root to the dev panel
  const others = room.getOthersAsTreeNode();
  if (others) {
    sendToPanel({
      msg: "room::sync::partial",
      roomId: room.id,
      others,
    });
  }
}

function fullSync(room: Room<JsonObject, LsonObject, BaseUserMeta, Json>) {
  const root = room.getStorageSnapshot();
  const me = room.getSelfAsTreeNode();
  const others = room.getOthersAsTreeNode();
  sendToPanel({
    msg: "room::sync::full",
    roomId: room.id,
    storage: root?.toStorageTreeNode("root").children ?? null,
    me,
    others,
  });
}

// Currently registered "channel" listeners, waiting for "room::subscribe" or
// "room::unsubscribe" messages coming from the devtools panel
const roomChannelListeners = new Map<string, () => void>();

function stopRoomChannelListener(roomId: string) {
  const listener = roomChannelListeners.get(roomId);
  roomChannelListeners.delete(roomId);
  if (listener) {
    listener();
  }
}

/**
 * Publicly announce to the devtool panel that a new room is available.
 */
export function linkDevtools(
  roomId: string,
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
): void {
  // Define it as a no-op in production environments or when run outside of a browser context
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  sendToPanel({ msg: "room::available", roomId });

  // Before adding a new listener, stop all active listeners, so there is only
  // ever going to be one listener per room "channel"
  stopRoomChannelListener(roomId);
  roomChannelListeners.set(
    roomId,

    // Returns the unsubscribe callback, that we store in the
    // roomChannelListeners registry
    onMessageFromPanel.subscribe((msg) => {
      switch (msg.msg) {
        // Sent by the devtool panel when it wants to receive the sync stream
        // for a room
        case "room::subscribe": {
          // Only act on this message if it's intended for this room
          if (msg.roomId === roomId) {
            startSyncStream(room);
          }
          break;
        }

        case "room::unsubscribe": {
          // Only act on this message if it's intended for this room
          if (msg.roomId === roomId) {
            stopSyncStream(roomId);
          }
          break;
        }
      }
    })
  );
}

export function unlinkDevtools(roomId: string): void {
  // Define it as a no-op in production environments or when run outside of a browser context
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  // Immediately stop the sync stream of room updates to the dev panel
  stopSyncStream(roomId);

  stopRoomChannelListener(roomId);

  // Inform dev panel that this room is no longer available
  sendToPanel({
    msg: "room::unavailable",
    roomId,
  });
}
