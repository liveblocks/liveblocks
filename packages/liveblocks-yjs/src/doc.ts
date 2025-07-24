import { DerivedSignal, Signal, type YjsSyncStatus } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export enum DocumentState {
  Idle = "@idle",
  LoadingDirty = "@loading.dirty",
  LoadingSyncing = "@loading.syncing",
  LoadedDirty = "@loaded.dirty",
  LoadedSyncing = "@loaded.syncing",
  Synced = "@synced",
}

export default class yDocHandler extends Observable<unknown> {
  private unsubscribers: Array<() => void> = [];

  private doc: Y.Doc;
  private updateRoomDoc: (update: Uint8Array) => void;
  private fetchRoomDoc: (vector: string) => void;
  private useV2Encoding: boolean;
  private localSnapshotΣ: Signal<Y.Snapshot>;
  private remoteSnapshotΣ: Signal<Y.Snapshot | null>;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly DEBOUNCE_INTERVAL_MS = 200;

  private stateΣ = new Signal<DocumentState>(DocumentState.Idle);
  private numOfPendingSyncs = 0;

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

    this.localSnapshotΣ = new Signal<Y.Snapshot>(Y.snapshot(doc));
    this.remoteSnapshotΣ = new Signal<Y.Snapshot | null>(null);

    const isLocalAndRemoteSnapshotEqualΣ = DerivedSignal.from(() => {
      const remoteSnapshot = this.remoteSnapshotΣ.get();
      if (remoteSnapshot === null) return false;
      return Y.equalSnapshots(this.localSnapshotΣ.get(), remoteSnapshot);
    });

    this.unsubscribers.push(
      isLocalAndRemoteSnapshotEqualΣ.subscribe(() => {
        if (isLocalAndRemoteSnapshotEqualΣ.get()) {
          this.stateΣ.set(DocumentState.Synced);
        }
      }),
      this.stateΣ.subscribe(() => {
        const state = this.stateΣ.get();
        if (state === DocumentState.Synced) {
          this.emit("synced", [true]);
          this.emit("sync", [true]);
        }
        // If the state is reset to 'idle', we emit 'synced' and 'sync' event with 'false' payload.
        // Additionally, we reset the number of pending syncs to 0.
        else if (state === DocumentState.Idle) {
          this.numOfPendingSyncs = 0;
          this.emit("synced", [false]);
          this.emit("sync", [false]);
        }
      })
    );

    this.stateΣ.set(DocumentState.Idle);
  }

  public handleServerUpdate = ({
    update,
    stateVector,
    readOnly,
    v2,
    remoteSnapshot,
  }: {
    update: Uint8Array;
    stateVector: string | null;
    readOnly: boolean;
    v2?: boolean;
    remoteSnapshot?: Uint8Array;
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

      if (this.numOfPendingSyncs > 0) {
        this.numOfPendingSyncs -= 1;
      }

      const currentState = this.stateΣ.get();
      if (
        currentState !== DocumentState.LoadingDirty &&
        currentState !== DocumentState.LoadedDirty &&
        this.numOfPendingSyncs === 0
      ) {
        this.stateΣ.set(DocumentState.Synced);
      }
    }

    // If a remote snapshot (combination of state vector and delete set) is provided, we update the remote snapshot state
    if (remoteSnapshot !== undefined) {
      const snapshot = v2
        ? Y.decodeSnapshotV2(remoteSnapshot)
        : Y.decodeSnapshot(remoteSnapshot);
      this.remoteSnapshotΣ.set(snapshot);
    }
  };

  public syncDoc = (): void => {
    // We set the state to syncing (loading or loaded) and increment the number of pending syncs
    this.stateΣ.set(
      this.stateΣ.get() === DocumentState.Idle
        ? DocumentState.LoadingSyncing
        : DocumentState.LoadedSyncing
    );
    this.numOfPendingSyncs += 1;

    // The state vector is sent to the server so it knows what to send back
    // if you don't send it, it returns everything
    const encodedVector = Base64.fromUint8Array(Y.encodeStateVector(this.doc));
    this.fetchRoomDoc(encodedVector);
  };

  // The sync'd property is required by some provider implementations
  get synced(): boolean {
    return this.stateΣ.get() === DocumentState.Synced;
  }

  set synced(state: boolean) {
    this.stateΣ.set(state ? DocumentState.Synced : DocumentState.Idle);
  }

  private debounced_updateLocalSnapshot() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      // Compute local snapshot and update the local snapshot state
      this.localSnapshotΣ.set(Y.snapshot(this.doc));
      this.debounceTimer = null;

      const state = this.stateΣ.get();
      if (state !== DocumentState.Synced) {
        this.syncDoc();
      }
    }, yDocHandler.DEBOUNCE_INTERVAL_MS);
  }

  private updateHandler = (
    update: Uint8Array,
    origin: string | IndexeddbPersistence
  ) => {
    this.debounced_updateLocalSnapshot();

    if (origin !== "backend") {
      const currentState = this.stateΣ.get();
      const isDocumentLoaded =
        currentState === DocumentState.LoadedDirty ||
        currentState === DocumentState.LoadedSyncing ||
        currentState === DocumentState.Synced;

      this.stateΣ.set(
        isDocumentLoaded
          ? DocumentState.LoadedDirty
          : DocumentState.LoadingDirty
      );
    }

    // don't send updates from indexedb, those will get handled by sync
    const isFromLocal = origin instanceof IndexeddbPersistence;
    if (origin !== "backend" && !isFromLocal) {
      this.updateRoomDoc(update);
    }
  };

  /**
   * @internal
   * @returns The current synchronization status of the document. This method is experimental and may change in the future.
   * - "loading": an initial synchronization request is pending, i.e., we have received any remote document yet (resets after websocket disconnection)
   * - "synchronizing": there are local updates to the document that have not been synchronized or acknolwedged by the server yet.
   * - "synchronized": the document is in sync with the server, i.e., all local updates have been acknowledged by the server and the local snapshot is equal to the remote snapshot.
   */
  experimental_getSyncStatus(): YjsSyncStatus {
    const state = this.stateΣ.get();
    if (
      state === DocumentState.Idle ||
      state === DocumentState.LoadingDirty ||
      state === DocumentState.LoadingSyncing
    ) {
      return "loading";
    }
    if (
      state === DocumentState.LoadedDirty ||
      state === DocumentState.LoadedSyncing
    ) {
      return "synchronizing";
    }
    return "synchronized";
  }

  destroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.doc.off("update", this.updateHandler);
    this.unsubscribers.forEach((unsub) => unsub());
    this._observers = new Map();
    this.doc.destroy();
  }
}
