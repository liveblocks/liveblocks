import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  Room,
} from "@liveblocks/client";
import type { BaseMetadata, DE, DM, DP, DS, DU } from "@liveblocks/core";
import { ClientMsgCode, detectDupes } from "@liveblocks/core";
import { Observable } from "lib0/observable";
import type * as Y from "yjs";

import { Awareness } from "./awareness";
import yDocHandler from "./doc";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

type ProviderOptions = {
  autoloadSubdocs?: boolean;
  readOnly?: boolean;
};

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
        const { stateVector, update, guid } = message;
        // find the right doc and update
        if (guid !== undefined) {
          this.subdocHandlers.get(guid)?.handleServerUpdate({
            update,
            stateVector,
            readOnly: this.options.readOnly ?? false,
          });
        } else {
          this.rootDocHandler.handleServerUpdate({
            update,
            stateVector,
            readOnly: this.options.readOnly ?? false,
          });
        }
      })
    );

    this.rootDocHandler.on("synced", () => {
      const state = this.rootDocHandler.synced;
      for (const [_, handler] of this.subdocHandlers) {
        handler.syncDoc();
      }
      this.emit("synced", [state]);
      this.emit("sync", [state]);
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

  private updateDoc = (update: string, guid?: string) => {
    if (this.options.readOnly) return;
    this.room.updateYDoc(update, guid);
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
