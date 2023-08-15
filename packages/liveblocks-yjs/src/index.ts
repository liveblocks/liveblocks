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
import { detectDupes } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import * as Y from "yjs";

import { Awareness } from "./awareness";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

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
      this.room.events.ydoc.subscribe(({ update, stateVector }) => {
        // apply update from the server
        Y.applyUpdate(this.doc, Base64.toUint8Array(update), "backend");

        // if this update is the result of a fetch, the state vector is included
        if (stateVector) {
          // Use server state to calculate a diff and send it
          try {
            const localUpdate = Y.encodeStateAsUpdate(
              this.doc,
              Base64.toUint8Array(stateVector)
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
