import {
  DerivedSignal,
  type IYjsProvider,
  type OpaqueRoom,
  type YjsSyncStatus,
} from "@liveblocks/core";
import { ClientMsgCode, kInternal, MutableSignal } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import { IndexeddbPersistence } from "y-indexeddb";
import type { Doc } from "yjs";
import { parseUpdateMeta, PermanentUserData } from "yjs";

import { Awareness } from "./awareness";
import yDocHandler from "./doc";

export type ProviderOptions = {
  enablePermanentUserData?: boolean;
  autoloadSubdocs?: boolean;
  offlineSupport_experimental?: boolean;
  useV2Encoding_experimental?: boolean;
};

export class LiveblocksYjsProvider
  extends Observable<unknown>
  implements IYjsProvider
{
  private readonly room: OpaqueRoom;
  private readonly rootDoc: Doc;
  private readonly options: ProviderOptions;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  private isPaused = false;

  private readonly unsubscribers: Array<() => void> = [];

  public readonly awareness: Awareness;

  private readonly rootDocHandler: yDocHandler;
  private readonly subdocHandlersΣ = new MutableSignal<
    Map<string, yDocHandler>
  >(new Map());
  private readonly overallSyncStatusΣ: DerivedSignal<YjsSyncStatus>;

  public readonly permanentUserData?: PermanentUserData;

  private pending: string[] = [];

  constructor(room: OpaqueRoom, doc: Doc, options: ProviderOptions = {}) {
    super();
    this.rootDoc = doc;
    this.room = room;
    this.options = options;
    this.rootDocHandler = new yDocHandler({
      doc,
      isRoot: true,
      updateDoc: this.updateDoc,
      fetchDoc: this.fetchDoc,
      useV2Encoding: this.options.useV2Encoding_experimental ?? false,
    });

    if (this.options.enablePermanentUserData) {
      this.permanentUserData = new PermanentUserData(doc);
    }

    // TODO: Display a warning if a YjsProvider is already attached to the room
    room[kInternal].setYjsProvider(this);

    // if we have a connectionId already during construction, use that
    this.awareness = new Awareness(this.rootDoc, this.room);

    this.unsubscribers.push(
      this.room.events.status.subscribe((status) => {
        if (status === "connected") {
          this.rootDocHandler.syncDoc();
        } else {
          this.rootDocHandler.synced = false;
        }
      })
    );

    this.unsubscribers.push(
      this.room.events.ydoc.subscribe((message) => {
        const { type } = message;
        if (type === ClientMsgCode.UPDATE_YDOC) {
          // don't apply updates that came from the client
          return;
        }
        const {
          stateVector,
          update: updateStr,
          guid,
          v2,
          remoteSnapshot,
        } = message;
        const canWrite = this.room.getSelf()?.canWrite ?? true;
        const update = Base64.toUint8Array(updateStr);
        const updateId = this.getUniqueUpdateId(update);
        this.pending = this.pending.filter((pendingUpdate) => {
          if (pendingUpdate === updateId) {
            return false;
          }
          return true;
        });
        // find the right doc and update
        if (guid !== undefined) {
          this.subdocHandlersΣ
            .get()
            .get(guid)
            ?.handleServerUpdate({
              update,
              stateVector,
              readOnly: !canWrite,
              v2,
              remoteSnapshot: Base64.toUint8Array(remoteSnapshot),
            });
        } else {
          this.rootDocHandler.handleServerUpdate({
            update,
            stateVector,
            readOnly: !canWrite,
            v2,
            remoteSnapshot: Base64.toUint8Array(remoteSnapshot),
          });
        }
      })
    );

    if (options.offlineSupport_experimental) {
      this.setupOfflineSupport();
    }

    // different consumers listen to sync and synced
    this.rootDocHandler.on("synced", () => {
      const state = this.rootDocHandler.synced;
      for (const [_, handler] of this.subdocHandlersΣ.get()) {
        handler.syncDoc();
      }
      this.emit("synced", [state]);
      this.emit("sync", [state]);
    });
    this.rootDoc.on("subdocs", this.handleSubdocs);
    this.syncDoc();

    this.overallSyncStatusΣ = DerivedSignal.from(() => {
      // 1. If the root document is loading, the overall status is also "loading".
      // 2. If the root document is synchronizing, the overall status is "synchronizing".
      // 3. If the root document is synchronized, we check the status of the subdocuments.
      //    If all subdocuments are synchronized, the overall status is "synchronized".
      //    Otherwise, the overall status is "synchronizing".
      const rootDocStatus = this.rootDocHandler.syncStatusSignalΣ.get();
      if (rootDocStatus === "loading") {
        return "loading";
      }
      if (rootDocStatus === "synchronizing") {
        return "synchronizing";
      }

      // If the root document is synchronized, we check the status of the subdocuments and if all subdocuments are synchronized, we return "synchronized".
      const subdocStatuses = Array.from(
        this.subdocHandlersΣ.get().values()
      ).map((handler) => handler.syncStatusSignalΣ.get());
      const allSubdocsSynchronized = subdocStatuses.every(
        (status) => status === "synchronized"
      );
      return allSubdocsSynchronized ? "synchronized" : "synchronizing";
    });

    this.overallSyncStatusΣ.subscribe(() => {
      this.emit("status", [this.overallSyncStatusΣ.get()]);
    });
  }

  private setupOfflineSupport = () => {
    this.indexeddbProvider = new IndexeddbPersistence(
      this.room.id,
      this.rootDoc
    );
    const onIndexedDbSync = () => {
      this.rootDocHandler.synced = true;
    };
    this.indexeddbProvider.on("synced", onIndexedDbSync);

    this.unsubscribers.push(() => {
      this.indexeddbProvider?.off("synced", onIndexedDbSync);
    });
  };

  private handleSubdocs = ({
    loaded,
    removed,
    added,
  }: {
    loaded: Set<Doc>;
    removed: Set<Doc>;
    added: Set<Doc>;
  }) => {
    loaded.forEach(this.createSubdocHandler);
    const subdocHandlers = this.subdocHandlersΣ.get();
    if (this.options.autoloadSubdocs) {
      for (const subdoc of added) {
        if (!subdocHandlers.has(subdoc.guid)) {
          subdoc.load();
        }
      }
    }
    for (const subdoc of removed) {
      if (subdocHandlers.has(subdoc.guid)) {
        subdocHandlers.get(subdoc.guid)?.destroy();
        subdocHandlers.delete(subdoc.guid);
      }
    }
  };

  private getUniqueUpdateId = (update: Uint8Array) => {
    const clock = parseUpdateMeta(update).to.get(this.rootDoc.clientID) ?? "-1";
    return this.rootDoc.clientID + ":" + clock;
  };

  private updateDoc = (update: Uint8Array, guid?: string) => {
    const canWrite = this.room.getSelf()?.canWrite ?? true;
    if (canWrite && !this.isPaused) {
      const updateId = this.getUniqueUpdateId(update);
      this.pending.push(updateId);
      this.room.updateYDoc(
        Base64.fromUint8Array(update),
        guid,
        this.useV2Encoding
      );
    }
  };

  private fetchDoc = (vector: string, guid?: string) => {
    this.room.fetchYDoc(vector, guid, this.useV2Encoding);
  };

  private createSubdocHandler = (subdoc: Doc): void => {
    const subdocHandlers = this.subdocHandlersΣ.get();
    if (subdocHandlers.has(subdoc.guid)) {
      // if we already handle this subdoc, just fetch it again
      subdocHandlers.get(subdoc.guid)?.syncDoc();
      return;
    }
    const handler = new yDocHandler({
      doc: subdoc,
      isRoot: false,
      updateDoc: this.updateDoc,
      fetchDoc: this.fetchDoc,
      useV2Encoding: this.options.useV2Encoding_experimental ?? false,
    });
    subdocHandlers.set(subdoc.guid, handler);
  };

  // attempt to load a subdoc of a given guid
  public loadSubdoc = (guid: string): boolean => {
    for (const subdoc of this.rootDoc.subdocs) {
      if (subdoc.guid === guid) {
        subdoc.load();
        return true;
      }
    }
    // should we throw instead?
    return false;
  };

  private syncDoc = () => {
    this.rootDocHandler.syncDoc();
    for (const [_, handler] of this.subdocHandlersΣ.get()) {
      handler.syncDoc();
    }
  };

  get useV2Encoding(): boolean {
    return this.options.useV2Encoding_experimental ?? false;
  }

  // The sync'd property is required by some provider implementations
  get synced(): boolean {
    return this.rootDocHandler.synced;
  }

  async pause(): Promise<void> {
    await this.indexeddbProvider?.destroy();
    this.indexeddbProvider = null;
    this.isPaused = true;
  }

  unpause(): void {
    this.isPaused = false;
    if (this.options.offlineSupport_experimental) {
      this.setupOfflineSupport();
    }
    this.rootDocHandler.syncDoc();
  }

  public getStatus(): YjsSyncStatus {
    return this.overallSyncStatusΣ.get();
  }

  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.awareness.destroy();
    this.rootDocHandler.destroy();
    this._observers = new Map();
    for (const [_, handler] of this.subdocHandlersΣ.get()) {
      handler.destroy();
    }
    this.subdocHandlersΣ.get().clear();
    super.destroy();
  }

  async clearOfflineData(): Promise<void> {
    if (!this.indexeddbProvider) return;
    return this.indexeddbProvider.clearData();
  }

  getYDoc(): Doc {
    return this.rootDoc;
  }

  // Some provider implementations expect to be able to call connect/disconnect, implement as noop
  disconnect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }

  connect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }
}
