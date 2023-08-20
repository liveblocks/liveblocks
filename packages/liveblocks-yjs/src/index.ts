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
import { Observable } from "lib0/observable";
import type * as Y from "yjs";

import { Awareness } from "./awareness";
import yDocHandler from "./doc";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

type ProviderOptions = {
  autoloadSubdocs: boolean;
};

export default class LiveblocksProvider<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
> extends Observable<unknown> {
  private room: Room<P, S, U, E>;
  private rootDoc: Y.Doc;

  private unsubscribers: Array<() => void> = [];

  public awareness: Awareness;

  public rootDocHandler: yDocHandler;
  public subdocHandlers: Map<string, yDocHandler> = new Map();

  constructor(
    room: Room<P, S, U, E>,
    doc: Y.Doc,
    { autoloadSubdocs }: ProviderOptions
  ) {
    super();
    this.rootDoc = doc;
    this.room = room;
    this.rootDocHandler = new yDocHandler({
      doc,
      isRoot: true,
      updateDoc: (update: string, guid?: string) => {
        this.room.updateYDoc(update, guid);
      },
      fetchDoc: (vector: string, guid?: string) => {
        this.room.fetchYDoc(vector, guid);
      },
    });

    // if we have a connectionId already during construction, use that
    const connectionId = this.room.getSelf()?.connectionId;
    if (connectionId) {
      this.rootDoc.clientID = connectionId;
    }
    this.awareness = new Awareness(this.rootDoc, this.room);
    const onRootSync = () => {
      const state = this.rootDocHandler.synced;
      if (autoloadSubdocs) {
        for (const subdoc of this.rootDoc.subdocs) {
          this.createSubdocHandler(subdoc);
        }
      } else {
        // if we're not autoloading all subdocs, just sync the ones we have
        for (const [_, handler] of this.subdocHandlers) {
          handler.syncDoc();
        }
      }
      this.emit("synced", [state]);
      this.emit("sync", [state]);
    };
    this.rootDocHandler.on("synced", onRootSync);
    this.unsubscribers.push(() => {
      this.rootDocHandler.off("synced", onRootSync);
    });

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
      this.room.events.ydoc.subscribe(({ update, stateVector, guid }) => {
        // find the right doc and update
        if (typeof guid === "undefined") {
          this.rootDocHandler.handleServerUpdate({ update, stateVector });
        } else if (this.subdocHandlers.has(guid)) {
          this.subdocHandlers
            .get(guid)
            ?.handleServerUpdate({ update, stateVector });
        }
      })
    );

    this.syncDoc();
  }

  private createSubdocHandler = (subdoc: Y.Doc): void => {
    if (this.subdocHandlers.has(subdoc.guid)) {
      // if we already handle this subdoc, just fetch it again
      this.subdocHandlers.get(subdoc.guid)?.syncDoc();
      return;
    }
    const handler = new yDocHandler({
      doc: subdoc,
      isRoot: false,
      updateDoc: (update: string, guid?: string) => {
        this.room.updateYDoc(update, guid);
      },
      fetchDoc: (vector: string, guid?: string) => {
        this.room.fetchYDoc(vector, guid);
      },
    });
    this.subdocHandlers.set(subdoc.guid, handler);
  };
  public loadSubdoc = (guid: string): boolean => {
    for (const subdoc of this.rootDoc.subdocs) {
      if (subdoc.guid === guid) {
        this.createSubdocHandler(subdoc);
        return true;
      }
    }
    // should we throw instead?
    return false;
  };

  private syncDoc = () => {
    /**
     * If the connection changes, set the new id, this is used by awareness.
     * yjs' only requirement for clientID is that it's truly unique and a number.
     * Liveblock's connectionID satisfies those constraints
     *  */
    this.rootDoc.clientID =
      this.room.getSelf()?.connectionId || this.rootDoc.clientID;
    this.awareness.clientID = this.rootDoc.clientID; // tell our awareness provider the new ID

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
    for (const [_, handler] of this.subdocHandlers) {
      handler.destroy();
    }
  }

  // Some provider implementations expect to be able to call connect/disconnect, implement as noop
  disconnect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }

  connect(): void {
    // This is a noop for liveblocks as connections are managed by the room
  }
}
