import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export default class yDocHandler extends Observable<unknown> {
  private unsubscribers: Array<() => void> = [];

  private _synced = false;
  private doc: Y.Doc;
  private updateRoomDoc: (update: Uint8Array) => void;
  private fetchRoomDoc: (vector: string) => void;
  private useV2Encoding: boolean;

  constructor({
    doc,
    isRoot,
    updateDoc,
    fetchDoc,
    useV2Encoding,
  }: {
    doc: Y.Doc;
    isRoot: boolean;
    updateDoc: (update: Uint8Array, guid?: string) => void;
    fetchDoc: (vector: string, guid?: string) => void;
    useV2Encoding: boolean;
  }) {
    super();
    this.doc = doc;
    this.useV2Encoding = useV2Encoding;
    // this.doc.load(); // this just emits a load event, it doesn't actually load anything
    this.doc.on(useV2Encoding ? "updateV2" : "update", this.updateHandler);
    this.updateRoomDoc = (update: Uint8Array) => {
      updateDoc(update, isRoot ? undefined : this.doc.guid);
    };
    this.fetchRoomDoc = (vector: string) => {
      fetchDoc(vector, isRoot ? undefined : this.doc.guid);
    };

    this.syncDoc();
  }

  public handleServerUpdate = ({
    update,
    stateVector,
    readOnly,
    v2,
  }: {
    update: Uint8Array;
    stateVector: string | null;
    readOnly: boolean;
    v2?: boolean;
  }): void => {
    // apply update from the server, updates from the server can be v1 or v2
    const applyUpdate = v2 ? Y.applyUpdateV2 : Y.applyUpdate;
    applyUpdate(this.doc, update, "backend");
    // if this update is the result of a fetch, the state vector is included
    if (stateVector) {
      if (!readOnly) {
        // Use server state to calculate a diff and send it
        try {
          // send v1 or v2update according to client option
          const encodeUpdate = this.useV2Encoding
            ? Y.encodeStateAsUpdateV2
            : Y.encodeStateAsUpdate;
          const localUpdate = encodeUpdate(
            this.doc,
            Base64.toUint8Array(stateVector)
          );
          this.updateRoomDoc(localUpdate);
        } catch (e) {
          // something went wrong encoding local state to send to the server
          console.warn(e);
        }
      }
      // now that we've sent our local and received from server, we're in sync
      // calling `syncDoc` again will sync up the documents
      this.synced = true;
    }
  };

  public syncDoc = (): void => {
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

  private updateHandler = (
    update: Uint8Array,
    origin: string | IndexeddbPersistence
  ) => {
    // don't send updates from indexedb, those will get handled by sync
    const isFromLocal = origin instanceof IndexeddbPersistence;
    if (origin !== "backend" && !isFromLocal) {
      this.updateRoomDoc(update);
    }
  };

  destroy(): void {
    this.doc.off("update", this.updateHandler);
    this.unsubscribers.forEach((unsub) => unsub());
    this._observers = new Map();
    this.doc.destroy();
  }
}
