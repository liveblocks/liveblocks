import type { Room } from "../room";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { LsonObject } from "../crdts/Lson";
import type { ImmutableDataObject } from "./protocol";
import { sendToPanel, onMessageFromPanel } from "./bridge";

export function linkDevtools(
  roomId: string,
  room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
) {
  // Define it as a no-op in production environments or when run outside of a browser context
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  // On connect, immediately send the broadcast to let any listening
  // devtool panels know the client is ready to connect
  sendToPanel({ msg: "wake-up-devtools" });

  // TODO: Only send these panel messages after we have had an acknowledgement from them
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
      case "connect": {
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
      // case "disconnect": {
      //   unsubscibeAllSyncers();
      //   break;
      // }

      default: {
        throw new Error(`Unhandled message from panel: ${msg.msg}`);
      }
    }
  });
}

export function unlinkDevtools(roomId: string) {
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
