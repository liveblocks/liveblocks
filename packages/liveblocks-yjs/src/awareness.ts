// TODO: apparently Yjs is full of anys or something, see if we can fix this
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { BaseUserMeta, JsonObject, User } from "@liveblocks/client";
import type { OpaqueRoom } from "@liveblocks/core";
import { Observable } from "lib0/observable";
import type * as Y from "yjs";

const Y_PRESENCE_KEY = "__yjs";
const Y_PRESENCE_ID_KEY = "__yjs_clientid";

type MetaClientState = {
  clock: number;
  lastUpdated: number;
};

/**
 * This class will store Yjs awareness in Liveblock's presence under the __yjs key
 * IMPORTANT: The Yjs awareness protocol uses ydoc.clientId to reference users
 * to their respective documents. To avoid mapping Yjs clientIds to liveblock's connectionId,
 * we simply set the clientId of the doc to the connectionId. Then no further mapping is required
 */
export class Awareness extends Observable<unknown> {
  private room: OpaqueRoom;
  public doc: Y.Doc;
  public states: Map<number, unknown> = new Map();
  // used to map liveblock's ActorId to Yjs ClientID, both unique numbers representing a client
  public actorToClientMap: Map<number, number> = new Map();
  // Meta is used to keep track and timeout users who disconnect. Liveblocks provides this for us, so we don't need to
  // manage it here. Unfortunately, it's expected to exist by various integrations, so it's an empty map.
  public meta: Map<number, MetaClientState> = new Map();
  // _checkInterval this would hold a timer to remove users, but Liveblock's presence already handles this
  // unfortunately it's typed by various integrations
  public _checkInterval: number = 0;

  private othersUnsub: () => void;
  constructor(doc: Y.Doc, room: OpaqueRoom) {
    super();
    this.doc = doc;
    this.room = room;
    // Add the clientId to presence so we can map it to connectionId later
    this.room.updatePresence({
      [Y_PRESENCE_ID_KEY]: this.doc.clientID,
    });
    this.othersUnsub = this.room.events.others.subscribe((event) => {
      let updates:
        | { added: number[]; updated: number[]; removed: number[] }
        | undefined;

      // When others are changed, we emit an event that contains arrays added/updated/removed.
      if (event.type === "leave") {
        const targetClientId = this.actorToClientMap.get(
          event.user.connectionId
        );
        if (targetClientId !== undefined) {
          updates = { added: [], updated: [], removed: [targetClientId] };
        }
        // rebuild after the user leaves so we can get the ID of the user who left
        this.rebuildActorToClientMap(event.others);
      }
      if (event.type === "enter" || event.type === "update") {
        this.rebuildActorToClientMap(event.others);
        const targetClientId = this.actorToClientMap.get(
          event.user.connectionId
        );
        if (targetClientId !== undefined) {
          updates = {
            added: event.type === "enter" ? [targetClientId] : [],
            updated: event.type === "update" ? [targetClientId] : [],
            removed: [],
          };
        }
      }
      if (event.type === "reset") {
        this.rebuildActorToClientMap(event.others);
      }
      if (updates !== undefined) {
        this.emit("change", [updates, "presence"]);
        this.emit("update", [updates, "presence"]);
      }
    });
  }

  rebuildActorToClientMap(
    others: readonly User<JsonObject, BaseUserMeta>[]
  ): void {
    this.actorToClientMap.clear();
    others.forEach((user) => {
      if (user.presence[Y_PRESENCE_ID_KEY] !== undefined) {
        this.actorToClientMap.set(
          user.connectionId,
          user.presence[Y_PRESENCE_ID_KEY] as number
        );
      }
    });
  }

  destroy(): void {
    this.emit("destroy", [this]);
    this.othersUnsub();
    this.setLocalState(null);
    super.destroy();
  }

  getLocalState(): JsonObject | null {
    const presence = this.room.getPresence();
    if (
      Object.keys(presence).length === 0 ||
      typeof presence[Y_PRESENCE_KEY] === "undefined"
    ) {
      return null;
    }
    return presence[Y_PRESENCE_KEY] as JsonObject | null;
  }

  setLocalState(state: Partial<JsonObject> | null): void {
    const presence = this.room.getSelf()?.presence;
    if (state === null) {
      if (presence === undefined) {
        // if presence is already undefined, we don't need to change anything here
        return;
      }
      this.room.updatePresence({ ...presence, [Y_PRESENCE_KEY]: null });
      this.emit("update", [
        { added: [], updated: [], removed: [this.doc.clientID] },
        "local",
      ]);
      return;
    }
    // if presence was undefined, it's added, if not, it's updated
    const yPresence = presence?.[Y_PRESENCE_KEY];
    const added = yPresence === undefined ? [this.doc.clientID] : [];
    const updated = yPresence === undefined ? [] : [this.doc.clientID];
    this.room.updatePresence({
      [Y_PRESENCE_KEY]: {
        ...((yPresence as JsonObject) || {}),
        ...(state || {}),
      },
    });
    this.emit("update", [{ added, updated, removed: [] }, "local"]);
  }

  setLocalStateField(field: string, value: JsonObject | null): void {
    const presence = this.room.getSelf()?.presence[Y_PRESENCE_KEY];
    const update = { [field]: value } as Partial<JsonObject>;
    this.room.updatePresence({
      [Y_PRESENCE_KEY]: { ...((presence as JsonObject) || {}), ...update },
    });
  }

  // Translate liveblocks presence to yjs awareness
  getStates(): Map<number, unknown> {
    const others = this.room.getOthers();
    const states = others.reduce((acc: Map<number, unknown>, otherUser) => {
      const otherPresence = otherUser.presence[Y_PRESENCE_KEY];
      const otherClientId = otherUser.presence[Y_PRESENCE_ID_KEY] as
        | number
        | undefined;
      if (otherPresence !== undefined && otherClientId !== undefined) {
        // set states of map clientId to yjs presence
        acc.set(otherClientId, otherPresence || {});
      }
      return acc;
    }, new Map<number, unknown>());

    // add this client's yjs presence to states (local client not represented in others)
    const localPresence = this.room.getSelf()?.presence[Y_PRESENCE_KEY];
    if (localPresence !== undefined) {
      states.set(this.doc.clientID, localPresence);
    }
    return states;
  }
}
