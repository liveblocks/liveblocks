import type { LsonObject } from "../crdts/Lson";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { Room } from "../room";
import { activateBridge, onMessageFromPanel, sendToPanel } from "./bridge";
import type { ImmutableDataObject } from "./protocol";

let _hasBeenSetup = false;

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

  if (_hasBeenSetup) {
    // This setup code should only happen the first time
    return;
  }

  _hasBeenSetup = true;

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

  function syncStorage() {
    const root = room.getStorageSnapshot();
    if (root) {
      sendToPanel({
        msg: "room::sync::partial",
        roomId,
        storage: root.toImmutable() as ImmutableDataObject,
      });
    }
  }

  function syncMe() {
    const me = room.getSelf();
    if (me) {
      sendToPanel({
        msg: "room::sync::partial",
        roomId,
        me,
      });
    }
  }

  function syncOthers() {
    // Any time others updates, send the new storage root to the dev panel
    const others = room.getOthers();
    if (others) {
      sendToPanel({
        msg: "room::sync::partial",
        roomId,
        others,
      });
    }
  }

  function syncFullState() {
    const root = room.getStorageSnapshot();
    const me = room.getSelf();
    const others = room.getOthers();
    sendToPanel({
      msg: "room::sync::full",
      roomId,
      storage: (root?.toImmutable() as ImmutableDataObject) ?? null,
      me,
      others,
    });
  }

  // XXX Lift this up to the module level, so we can use it in unlinkDevtools() too
  const unsubs: (() => void)[] = [];

  function unsubscribeAllSyncers() {
    let unsub: (() => void) | undefined;
    while ((unsub = unsubs.pop())) {
      // Unsubscribe all of the listeners we registered since the
      // devpanel "connected"
      unsub();
    }
  }

  onMessageFromPanel.subscribe((msg) => {
    switch (msg.msg) {
      // When a devtool panel "connects" to a live running client, send
      // it the current state, and start sending it updates whenever
      // the state changes.
      case "room::subscribe": {
        if (msg.roomId !== roomId) {
          // Not for this room
          break;
        }

        unsubscribeAllSyncers();

        // Sync the room ID instantly, as soon as we know it
        syncFullState();

        unsubs.push(
          // When storage initializes, send the update
          room.events.storageDidLoad.subscribeOnce(syncStorage),

          // Any time storage updates, send the new storage root
          room.events.storage.subscribe(syncStorage),

          // Any time "me" or "others" updates, send the new values accordingly
          room.events.me.subscribe(syncMe),
          room.events.others.subscribe(syncOthers)
        );

        break;
      }

      // TODO: Implement this message from the dev panel, when it closes
      // case "room:unsubscribe": {
      //   unsubscribeAllSyncers();
      //   break;
      // }

      // We don't have to handle "connect" events here, at the individual room level
      case "connect":
      default: {
        // Ignore unknown messages
        break;
      }
    }
  });
}

export function unlinkDevtools(roomId: string): void {
  // Define it as a no-op in production environments or when run outside of a browser context
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  // XXX TODO Unsubscribe runtime stuff here!

  sendToPanel({
    msg: "room::unavailable",
    roomId,
  });
}
