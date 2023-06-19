// TODO: apparently YJS is full of anys or something, see if we can fix this
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
import { Base64 } from "js-base64";
import { Observable } from "lib0/observable";
import * as Y from "yjs";

type RoomEvent = {
  type: "REFRESH";
};

type LiveblocksYjsOptions = {
  httpEndpoint?: string;
};

type RefreshResponse = {
  updates: string[];
  lastUpdate: number;
};

type MetaClientState = {
  clock: number;
  lastUpdated: number;
};

export class Awareness extends Observable<any> {
  private room: Room<JsonObject, LsonObject, BaseUserMeta, Json>;
  public doc: Y.Doc;
  public clientID: number;
  public states: Map<number, any> = new Map();
  // Meta is used to keep track and timeout users who disconnect. Liveblocks provides this for us, so we don't need to
  // manage it here. Unfortunately, it's expected to exist by various integrations, so it's an empty map.
  public meta: Map<number, MetaClientState> = new Map();
  // _checkInterval this would hold a timer to remove users, but Liveblock's presence already handles this
  // unfortunately it's expected to exist by various integrations.
  public _checkInterval: number = 0;

  private othersUnsub: () => void;
  constructor(
    doc: Y.Doc,
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    super();
    this.doc = doc;
    this.room = room;
    this.clientID = doc.clientID;
    this.othersUnsub = this.room.events.others.subscribe(({ event }) => {
      if (event.type === "leave") {
        // REMOVED
        this.emit("change", [
          { added: [], updated: [], removed: [event.user.connectionId] },
          "local",
        ]);
      }

      if (event.type === "enter") {
        // ADDED
        this.emit("change", [
          { added: [event.user.connectionId], updated: [], removed: [] },
          "local",
        ]);
      }

      if (event.type === "update") {
        // UPDATED
        this.emit("change", [
          { added: [], updated: [event.user.connectionId], removed: [] },
          "local",
        ]);
      }
    });
  }

  destroy(): void {
    this.emit("destroy", [this]);
    this.othersUnsub();
    this.setLocalState(null);
    super.destroy();
  }

  getLocalState(): JsonObject | null {
    const presence = this.room.getPresence();
    if (Object.keys(this.room.getPresence()).length === 0) {
      return null;
    }
    return presence["__yjs"] as JsonObject | null;
  }

  setLocalState(state: Partial<JsonObject> | null): void {
    const presence = this.room.getSelf()?.presence["__yjs"];
    this.room.updatePresence({
      __yjs: { ...((presence as JsonObject) || {}), ...(state || {}) },
    });
  }

  setLocalStateField(field: string, value: JsonObject | null): void {
    const presence = this.room.getSelf()?.presence["__yjs"];
    const update = { [field]: value } as Partial<JsonObject>;
    this.room.updatePresence({
      __yjs: { ...((presence as JsonObject) || {}), ...update },
    });
  }

  // Translate liveblocks presence to yjs awareness
  getStates(): Map<number, any> {
    const others = this.room.getOthers();
    const states = others.reduce((acc: Map<number, any>, currentValue) => {
      if (currentValue.connectionId) {
        acc.set(
          currentValue.connectionId,
          currentValue.presence["__yjs"] || {}
        );
      }
      return acc;
    }, new Map());
    return states;
  }
}

export default class LiveblocksProvider<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json
> {
  private room: Room<P, S, U, E>;
  private httpEndpoint?: string;
  private lastUpdateDate: null | Date = null;
  private doc: Y.Doc;

  private unsubscribers: Array<() => void> = [];

  public awareness: Awareness;

  constructor(
    room: Room<P, S, U, E>,
    doc: Y.Doc,
    config?: LiveblocksYjsOptions
  ) {
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
      this.room.events.connection.subscribe((e) => {
        if (e === "open") {
          /**
           * If the connection changes, set the new id, this is used by awareness
           * yjs' only requirement for clientID is that it's truly unique and a number.
           * Liveblock's connectionID satisfies those constraints
           *  */
          this.doc.clientID =
            this.room.getSelf()?.connectionId || this.doc.clientID;
          this.awareness.clientID = this.doc.clientID; // tell our awareness provider the new ID

          // The state vector is sent to the server so it knows what to send back
          // if you don't send it, it returns everything
          const encodedVector = Base64.fromUint8Array(
            Y.encodeStateVector(this.doc)
          );
          this.room.getDoc(encodedVector);
        }
      })
    );

    this.unsubscribers.push(
      this.room.events.docUpdated.subscribe((updates) => {
        const decodedUpdates: Uint8Array[] = updates.map(Base64.toUint8Array);
        const update = Y.mergeUpdates(decodedUpdates);
        Y.applyUpdate(this.doc, update, "backend");
      })
    );

    if (config?.httpEndpoint) {
      this.httpEndpoint = config.httpEndpoint + "?room=" + this.room.id;

      this.unsubscribers.push(
        this.room.events.customEvent.subscribe(({ event }) => {
          if ((event as RoomEvent)?.type === "REFRESH") {
            void this.resyncHttp();
          }
        })
      );

      void this.resyncHttp();
    }
    this.room.getDoc();
  }

  private updateHandler = async (update: Uint8Array, origin: string) => {
    if (origin !== "backend") {
      const encodedUpdate = Base64.fromUint8Array(update);
      this.room.updateDoc(encodedUpdate);
      if (this.httpEndpoint) {
        await fetch(this.httpEndpoint, {
          method: "POST",
          body: encodedUpdate,
        });
      }
    }
  };

  private async resyncHttp() {
    if (!this.httpEndpoint) {
      return;
    }
    const response = await fetch(
      `${this.httpEndpoint}${
        this.lastUpdateDate !== null
          ? `&after=${this.lastUpdateDate.toISOString()}`
          : ""
      }`
    );
    const { updates, lastUpdate } = (await response.json()) as RefreshResponse;

    if (updates.length === 0) {
      return;
    }

    this.lastUpdateDate = new Date(lastUpdate);

    const update = Y.mergeUpdates(updates.map(Base64.toUint8Array));
    Y.applyUpdate(this.doc, update, "backend");
  }

  destroy(): void {
    this.doc.off("update", this.updateHandler);
    this.unsubscribers.forEach((unsub) => unsub());
    this.awareness.destroy();
  }
}
