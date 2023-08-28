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
import { ClientMsgCode, detectDupes, YDocUpdate } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import * as Y from "yjs";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";
2;

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

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
    this.othersUnsub = this.room.events.others.subscribe(({ event }) => {
      // When others are changed, we emit an event that contains arrays added/updated/removed.
      if (event.type === "leave") {
        // REMOVED
        this.emit("change", [
          { added: [], updated: [], removed: [event.user.connectionId] },
          "local",
        ]);
      }

      if (event.type === "enter") {
        // ADDED
        this.emit("change", [
          { added: [event.user.connectionId], updated: [], removed: [] },
          "local",
        ]);
      }

      if (event.type === "update") {
        // UPDATED
        this.emit("change", [
          { added: [], updated: [event.user.connectionId], removed: [] },
          "local",
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
    const presence = this.room.getSelf()?.presence[Y_PRESENCE_KEY];
    this.room.updatePresence({
      __yjs: { ...((presence as JsonObject) || {}), ...(state || {}) },
    });
  }

  setLocalStateField(field: string, value: JsonObject | null): void {
    const presence = this.room.getSelf()?.presence[Y_PRESENCE_KEY];
    const update = { [field]: value } as Partial<JsonObject>;
    this.room.updatePresence({
      __yjs: { ...((presence as JsonObject) || {}), ...update },
    });
  }

  // Translate liveblocks presence to yjs awareness
  getStates(): Map<number, unknown> {
    const others = this.room.getOthers();
    const states = others.reduce((acc: Map<number, unknown>, currentValue) => {
      if (currentValue.connectionId) {
        // connectionId == actorId == yjs.clientId
        acc.set(
          currentValue.connectionId,
          currentValue.presence[Y_PRESENCE_KEY] || {}
        );
      }
      return acc;
    }, new Map());
    return states;
  }
}

export default class LiveblocksProvider<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
> extends Observable<unknown> {
  private room: Room<P, S, U, E>;
  private doc: Y.Doc;

  private unsubscribers: Array<() => void> = [];

  public awareness: Awareness;

  private _synced = false;

  constructor(room: Room<P, S, U, E>, doc: Y.Doc) {
    super();
    this.doc = doc;
    this.room = room;

    // if we have a connectionId already during construction, use that
    const connectionId = this.room.getSelf()?.connectionId;
    if (connectionId) {
      this.doc.clientID = connectionId;
    }
    this.awareness = new Awareness(this.doc, this.room);
    this.doc.on("update", this.updateHandler);

    this.unsubscribers.push(
      this.room.events.status.subscribe((status) => {
        if (status === "connected") {
          this.syncDoc();
        } else {
          this.synced = false;
        }
      })
    );

    this.unsubscribers.push(
      this.room.events.ydoc.subscribe(({ update, stateVector, type }) => {
         if (type === ClientMsgCode.UPDATE_YDOC) {
           // don't apply updates that came from the client
           return;
         }
        // apply update from the server
        Y.applyUpdate(this.doc, Base64.toUint8Array(update), "backend");

        // if this update is the result of a fetch, the state vector is included
        if (stateVector) {
          // Use server state to calculate a diff and send it
          try {
            const localUpdate = Y.encodeStateAsUpdate(
              this.doc,
              Base64.toUint8Array(stateVector as string)
            );
            this.room.updateYDoc(Base64.fromUint8Array(localUpdate));
          } catch (e) {
            // something went wrong encoding local state to send to the server
            console.warn(e);
          }
          // now that we've sent our local  and received from server, we're in sync
          // calling `syncDoc` again will sync up the documents
          this.synced = true;
        }
      })
    );
    this.syncDoc();
  }

  private syncDoc = () => {
    this.synced = false;
    /**
     * If the connection changes, set the new id, this is used by awareness.
     * yjs' only requirement for clientID is that it's truly unique and a number.
     * Liveblock's connectionID satisfies those constraints
     *  */
    this.doc.clientID = this.room.getSelf()?.connectionId || this.doc.clientID;
    this.awareness.clientID = this.doc.clientID; // tell our awareness provider the new ID

    // The state vector is sent to the server so it knows what to send back
    // if you don't send it, it returns everything
    const encodedVector = Base64.fromUint8Array(Y.encodeStateVector(this.doc));
    this.room.fetchYDoc(encodedVector);
  };

  // The sync'd property is required by some provider implementations
  get synced(): boolean {
    return this._synced;
  }

  set synced(state: boolean) {
    if (this._synced !== state) {
      this._synced = state;
      this.emit("synced", [state]);
      this.emit("sync", [state]);
    }
  }

  private updateHandler = (update: Uint8Array, origin: string) => {
    if (origin !== "backend") {
      const encodedUpdate = Base64.fromUint8Array(update);
      this.room.updateYDoc(encodedUpdate);
    }
  };

  destroy(): void {
    this.doc.off("update", this.updateHandler);
    this.unsubscribers.forEach((unsub) => unsub());
    this.awareness.destroy();
  }

  // Some provider implementations expect to be able to call connect/disconnect, implement as noop
  disconnect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }

  connect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }
}
