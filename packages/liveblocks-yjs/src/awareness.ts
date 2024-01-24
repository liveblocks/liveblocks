// TODO: apparently Yjs is full of anys or something, see if we can fix this
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  Room,
} from "@liveblocks/client";
import { Observable } from "lib0/observable";
import type * as Y from "yjs";

const Y_PRESENCE_KEY = "__yjs";

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
  private room: Room<JsonObject, LsonObject, BaseUserMeta, Json>;
  public doc: Y.Doc;
  public clientID: number;
  public states: Map<number, unknown> = new Map();
  // Meta is used to keep track and timeout users who disconnect. Liveblocks provides this for us, so we don't need to
  // manage it here. Unfortunately, it's expected to exist by various integrations, so it's an empty map.
  public meta: Map<number, MetaClientState> = new Map();
  // _checkInterval this would hold a timer to remove users, but Liveblock's presence already handles this
  // unfortunately it's typed by various integrations
  public _checkInterval: number = 0;

  private othersUnsub: () => void;
  constructor(
    doc: Y.Doc,
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    super();
    this.doc = doc;
    this.room = room;
    this.clientID = doc.clientID;
    this.othersUnsub = this.room.events.others.subscribe((event) => {
      // When others are changed, we emit an event that contains arrays added/updated/removed.
      if (event.type === "leave") {
        // REMOVED
        this.emit("change", [
          { added: [], updated: [], removed: [event.user.connectionId] },
          "presence",
        ]);
        this.emit("update", [
          { added: [], updated: [], removed: [event.user.connectionId] },
          "presence",
        ]);
      }

      if (event.type === "enter") {
        // ADDED
        this.emit("change", [
          { added: [event.user.connectionId], updated: [], removed: [] },
          "presence",
        ]);
        this.emit("update", [
          { added: [event.user.connectionId], updated: [], removed: [] },
          "presence",
        ]);
      }

      if (event.type === "update") {
        // UPDATED
        this.emit("change", [
          { added: [], updated: [event.user.connectionId], removed: [] },
          "presence",
        ]);
        this.emit("update", [
          { added: [], updated: [event.user.connectionId], removed: [] },
          "presence",
        ]);
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
      const { [Y_PRESENCE_KEY]: _, ...withoutYjs } = presence;
      this.room.updatePresence(withoutYjs);
      this.emit("update", [
        { added: [], updated: [], removed: [this.clientID] },
        "local",
      ]);
      return;
    }
    // if presence was undefined, it's added, if not, it's updated
    const yPresence = presence?.[Y_PRESENCE_KEY];
    const added = yPresence === undefined ? [this.clientID] : [];
    const updated = yPresence === undefined ? [] : [this.clientID];
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
    const presence = this.room.getSelf()?.presence[Y_PRESENCE_KEY];
    const states = others.reduce((acc: Map<number, unknown>, currentValue) => {
      if (
        currentValue.connectionId &&
        currentValue.presence[Y_PRESENCE_KEY] !== undefined
      ) {
        // connectionId == actorId == yjs.clientId
        acc.set(
          currentValue.connectionId,
          currentValue.presence[Y_PRESENCE_KEY] || {}
        );
      }
      return acc;
    }, new Map());
    if (presence !== undefined) {
      states.set(this.clientID, presence);
    }
    return states;
  }
}
