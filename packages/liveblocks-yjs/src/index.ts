import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  Room,
} from "@liveblocks/client";
import type { BaseMetadata, DE, DM, DP, DS, DU } from "@liveblocks/core";
import { ClientMsgCode, detectDupes, kInternal } from "@liveblocks/core";
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import * as Y from "yjs";

import { Awareness } from "./awareness";
import yDocHandler from "./doc";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

type ProviderOptions = {
  autoloadSubdocs?: boolean;
};

enum SyncStatus {
  Loading = "loading",
  Synchronizing = "synchronizing",
  Synchronized = "synchronized",
}

export class LiveblocksYjsProvider<
  P extends JsonObject = DP,
  S extends LsonObject = DS,
  U extends BaseUserMeta = DU,
  E extends Json = DE,
  M extends BaseMetadata = DM,
> extends Observable<unknown> {
  private room: Room<P, S, U, E, M>;
  private rootDoc: Y.Doc;
  private options: ProviderOptions;

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
        const { stateVector, update: updateStr, guid } = message;
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
            });
          } else {
            this.rootDocHandler.handleServerUpdate({
              update,
              stateVector,
              readOnly: !canWrite,
            });
          }
        }

        // notify any listeners that the status has changed
        this.emit("status", [this.getStatus()]);
      })
    );

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
    if (canWrite) {
      const updateId = this.getUniqueUpdateId(update);
      this.pending.push(updateId);
      this.room.updateYDoc(Base64.fromUint8Array(update), guid);
      this.emit("status", [this.getStatus()]);
    }
  };

  private fetchDoc = (vector: string, guid?: string) => {
    this.room.fetchYDoc(vector, guid);
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

  // The sync'd property is required by some provider implementations
  get synced(): boolean {
    return this.rootDocHandler.synced;
  }

  public getStatus(): SyncStatus {
    if (!this.synced) {
      return SyncStatus.Loading;
    }
    return this.pending.length === 0
      ? SyncStatus.Synchronized
      : SyncStatus.Synchronizing;
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

  // Some provider implementations expect to be able to call connect/disconnect, implement as noop
  disconnect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }

  connect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }
}
