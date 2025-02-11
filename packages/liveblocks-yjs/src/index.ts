import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  Room,
} from "@liveblocks/client";
import type {
  BaseMetadata,
  DE,
  DM,
  DP,
  DS,
  DU,
  IYjsProvider,
  YjsSyncStatus,
} from "@liveblocks/core";
import { ClientMsgCode, detectDupes, kInternal } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { Awareness } from "./awareness";
import yDocHandler from "./doc";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

type ProviderOptions = {
  autoloadSubdocs?: boolean;
  offlineSupport_experimental?: boolean;
  useV2Encoding_experimental?: boolean;
};

export class LiveblocksYjsProvider<
    P extends JsonObject = DP,
    S extends LsonObject = DS,
    U extends BaseUserMeta = DU,
    E extends Json = DE,
    M extends BaseMetadata = DM,
  >
  extends Observable<unknown>
  implements IYjsProvider
{
  public room: Room<P, S, U, E, M>;
  private rootDoc: Y.Doc;
  private options: ProviderOptions;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  private isPaused = false;

  private unsubscribers: Array<() => void> = [];

  public awareness: Awareness<P, S, U, E, M>;

  public rootDocHandler: yDocHandler;
  public subdocHandlers: Map<string, yDocHandler> = new Map();

  private pending: string[] = [];

  constructor(
    room: Room<P, S, U, E, M>,
    doc: Y.Doc,
    options: ProviderOptions | undefined = {}
  ) {
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
        this.emit("status", [this.getStatus()]);
      })
    );

    this.unsubscribers.push(
      this.room.events.ydoc.subscribe((message) => {
        const { type } = message;
        if (type === ClientMsgCode.UPDATE_YDOC) {
          // don't apply updates that came from the client
          return;
        }
        const { stateVector, update: updateStr, guid, v2 } = message;
        const canWrite = this.room.getSelf()?.canWrite ?? true;
        const update = Base64.toUint8Array(updateStr);
        let foundPendingUpdate = false;
        const updateId = this.getUniqueUpdateId(update);
        this.pending = this.pending.filter((pendingUpdate) => {
          if (pendingUpdate === updateId) {
            foundPendingUpdate = true;
            return false;
          }
          return true;
        });
        // if we found this update in our queue, we don't need to apply it
        if (!foundPendingUpdate) {
          // find the right doc and update
          if (guid !== undefined) {
            this.subdocHandlers.get(guid)?.handleServerUpdate({
              update,
              stateVector,
              readOnly: !canWrite,
              v2,
            });
          } else {
            this.rootDocHandler.handleServerUpdate({
              update,
              stateVector,
              readOnly: !canWrite,
              v2,
            });
          }
        }

        // notify any listeners that the status has changed
        this.emit("status", [this.getStatus()]);
      })
    );

    if (options.offlineSupport_experimental) {
      this.setupOfflineSupport();
    }

    // different consumers listen to sync and synced
    this.rootDocHandler.on("synced", () => {
      const state = this.rootDocHandler.synced;
      for (const [_, handler] of this.subdocHandlers) {
        handler.syncDoc();
      }
      this.emit("synced", [state]);
      this.emit("sync", [state]);
      this.emit("status", [this.getStatus()]);
    });
    this.rootDoc.on("subdocs", this.handleSubdocs);
    this.syncDoc();
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
    loaded: Set<Y.Doc>;
    removed: Set<Y.Doc>;
    added: Set<Y.Doc>;
  }) => {
    loaded.forEach(this.createSubdocHandler);
    if (this.options.autoloadSubdocs) {
      for (const subdoc of added) {
        if (!this.subdocHandlers.has(subdoc.guid)) {
          subdoc.load();
        }
      }
    }
    for (const subdoc of removed) {
      if (this.subdocHandlers.has(subdoc.guid)) {
        this.subdocHandlers.get(subdoc.guid)?.destroy();
        this.subdocHandlers.delete(subdoc.guid);
      }
    }
  };

  private getUniqueUpdateId = (update: Uint8Array) => {
    const clock =
      Y.parseUpdateMeta(update).to.get(this.rootDoc.clientID) ?? "-1";
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
      this.emit("status", [this.getStatus()]);
    }
  };

  private fetchDoc = (vector: string, guid?: string) => {
    this.room.fetchYDoc(vector, guid, this.useV2Encoding);
  };

  private createSubdocHandler = (subdoc: Y.Doc): void => {
    if (this.subdocHandlers.has(subdoc.guid)) {
      // if we already handle this subdoc, just fetch it again
      this.subdocHandlers.get(subdoc.guid)?.syncDoc();
      return;
    }
    const handler = new yDocHandler({
      doc: subdoc,
      isRoot: false,
      updateDoc: this.updateDoc,
      fetchDoc: this.fetchDoc,
      useV2Encoding: this.options.useV2Encoding_experimental ?? false,
    });
    this.subdocHandlers.set(subdoc.guid, handler);
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
    for (const [_, handler] of this.subdocHandlers) {
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
    if (!this.synced) {
      return "loading";
    }
    return this.pending.length === 0 ? "synchronized" : "synchronizing";
  }

  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.awareness.destroy();
    this.rootDocHandler.destroy();
    this._observers = new Map();
    for (const [_, handler] of this.subdocHandlers) {
      handler.destroy();
    }
    this.subdocHandlers.clear();
    super.destroy();
  }

  async clearOfflineData(): Promise<void> {
    if (!this.indexeddbProvider) return;
    return this.indexeddbProvider.clearData();
  }

  getYDoc(): Y.Doc {
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
