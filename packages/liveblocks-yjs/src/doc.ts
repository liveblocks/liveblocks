// TODO: apparently Yjs is full of anys or something, see if we can fix this
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { detectDupes } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import * as Y from "yjs";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export default class yDocHandler extends Observable<unknown> {
  private unsubscribers: Array<() => void> = [];

  private _synced = false;
  private doc: Y.Doc;
  private updateRoomDoc: (update: string) => void;
  private fetchRoomDoc: (vector: string) => void;

  constructor(
    doc: Y.Doc,
    updateDoc: (update: string, guid: string) => void,
    fetchDoc: (vector: string, guid: string) => void
  ) {
    super();
    this.doc = doc;
    this.doc.on("update", this.updateHandler);
    this.syncDoc();
    this.updateRoomDoc = (update: string) => {
      updateDoc(update, this.doc.guid);
    };
    this.fetchRoomDoc = (vector: string) => {
      fetchDoc(vector, this.doc.guid);
    };
  }

  public handleServerUpdate = ({
    update,
    stateVector,
  }: {
    update: string;
    stateVector: string;
  }): void => {
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
        this.updateRoomDoc(Base64.fromUint8Array(localUpdate));
      } catch (e) {
        // something went wrong encoding local state to send to the server
        console.warn(e);
      }
      // now that we've sent our local  and received from server, we're in sync
      // calling `syncDoc` again will sync up the documents
      this.synced = true;
    }
  };

  private syncDoc = () => {
    this.synced = false;

    // The state vector is sent to the server so it knows what to send back
    // if you don't send it, it returns everything
    const encodedVector = Base64.fromUint8Array(Y.encodeStateVector(this.doc));
    this.fetchRoomDoc(encodedVector);
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
      this.updateRoomDoc(encodedUpdate);
    }
  };

  destroy(): void {
    this.doc.off("update", this.updateHandler);
    this.unsubscribers.forEach((unsub) => unsub());
  }
}
