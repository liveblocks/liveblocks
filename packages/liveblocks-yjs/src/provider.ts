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
import { PermanentUserData } from "yjs";

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

  public readonly rootDocHandler: yDocHandler;
  private readonly subdocHandlersΣ = new MutableSignal<
    Map<string, yDocHandler>
  >(new Map());
  private readonly syncStatusΣ: DerivedSignal<YjsSyncStatus>;

  public readonly permanentUserData?: PermanentUserData;

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
          remoteSnapshotHash,
        } = message;
        const canWrite = this.room.getSelf()?.canWrite ?? true;
        const update = Base64.toUint8Array(updateStr);

        // find the right doc and update
        if (guid !== undefined) {
          this.subdocHandlersΣ.get().get(guid)?.handleServerUpdate({
            update,
            stateVector,
            readOnly: !canWrite,
            v2,
            remoteSnapshotHash,
          });
        } else {
          this.rootDocHandler.handleServerUpdate({
            update,
            stateVector,
            readOnly: !canWrite,
            v2,
            remoteSnapshotHash,
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

    this.syncStatusΣ = DerivedSignal.from(() => {
      // If the root document is loading or synchronizing, we infer that the overall status is also loading or synchronizing.
      const rootDocumentStatus =
        this.rootDocHandler.experimental_getSyncStatus();
      if (
        rootDocumentStatus === "loading" ||
        rootDocumentStatus === "synchronizing"
      ) {
        return rootDocumentStatus;
      }

      // If the root document is synchronized, we check if all subdocs are synchronized. If at least one subdoc is not synchronized, we are still synchronizing.
      const subdocumentStatuses = Array.from(
        this.subdocHandlersΣ.get().values()
      ).map((handler) => handler.experimental_getSyncStatus());
      if (subdocumentStatuses.some((state) => state !== "synchronized")) {
        return "synchronizing";
      }
      return "synchronized";
    });

    this.emit("status", [this.getStatus()]);

    this.unsubscribers.push(
      this.syncStatusΣ.subscribe(() => {
        this.emit("status", [this.getStatus()]);
      })
    );
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

  private updateDoc = (update: Uint8Array, guid?: string) => {
    const canWrite = this.room.getSelf()?.canWrite ?? true;
    if (canWrite && !this.isPaused) {
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
    return this.syncStatusΣ.get();
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

  get subdocHandlers(): Map<string, yDocHandler> {
    return this.subdocHandlersΣ.get();
  }

  set subdocHandlers(value: Map<string, yDocHandler>) {
    this.subdocHandlersΣ.mutate((map) => {
      map.clear();
      for (const [key, handler] of value) {
        map.set(key, handler);
      }
    });
  }
}
