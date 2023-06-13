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
import type { Doc } from "yjs";
import { applyUpdate, mergeUpdates } from "yjs";

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

export class Awareness extends Observable<any> {
  private room: Room<JsonObject, LsonObject, BaseUserMeta, Json>;
  public doc: Doc;
  public clientID: number;
  public states: Map<string, any> = new Map();
  public meta: Map<string, any> = new Map();
  public _checkInterval: number = 0;

  private unsub: () => void;
  constructor(
    doc: Doc,
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>
  ) {
    super();
    this.doc = doc;
    this.room = room;
    this.clientID = doc.clientID;
    this.unsub = this.room.events.others.subscribe(({ event }) => {
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
    this.unsub();
    super.destroy();
    this.setLocalState(null);
  }

  getLocalState(): JsonObject | null {
    const presence = this.room.getPresence();
    if (Object.keys(this.room.getPresence()).length === 0) {
      return null;
    }
    return presence["__yjs"] as JsonObject | null;
  }

  setLocalState(state: Partial<JsonObject> | null): void {
    const self = this.room.getSelf();

    if (!self) {
      return; // we're not connected
    }

    this.room.updatePresence({ __yjs: { ...(state || {}) } });
  }

  setLocalStateField(field: string, value: JsonObject | null): void {
    const update = { [field]: value } as Partial<JsonObject>;
    this.room.updatePresence({ __yjs: update });
  }

  // Translate
  getStates(): Map<number, any> {
    const others = this.room.getOthers();
    const states = others.reduce((acc: Map<number, any>, currentValue) => {
      if (currentValue.connectionId) {
        acc.set(currentValue.connectionId, currentValue.presence["__yjs"]);
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
  private doc: Doc;

  public awareness: Awareness;

  constructor(room: Room<P, S, U, E>, doc: Doc, config?: LiveblocksYjsOptions) {
    this.doc = doc;
    this.room = room;

    // if we have a connectionId already during construction, use that
    const connectionId = this.room.getSelf()?.connectionId;
    if (connectionId) {
      this.doc.clientID = connectionId;
    }
    this.awareness = new Awareness(this.doc, this.room);
    this.doc.on("update", this.handleUpdate);

    // if the connection changes, set the new id
    this.room.events.connection.subscribe((e) => {
      if (e === "open") {
        this.doc.clientID =
          this.room.getSelf()?.connectionId || this.doc.clientID;
        this.awareness.clientID = this.doc.clientID;
        this.room.getDoc();
      }
    });

    this.room.events.docUpdated.subscribe((updates) => {
      const decodedUpdates: Uint8Array[] = updates.map(Base64.toUint8Array);
      const update = mergeUpdates(decodedUpdates);
      applyUpdate(this.doc, update, "backend");
    });

    if (config?.httpEndpoint) {
      this.httpEndpoint = config.httpEndpoint + "?room=" + this.room.id;

      this.room.events.customEvent.subscribe(({ event }) => {
        if ((event as RoomEvent)?.type === "REFRESH") {
          void this.resyncHttp();
        }
      });

      void this.resyncHttp();
    }
    this.room.getDoc();
  }

  private handleUpdate = async (update: Uint8Array, origin: string) => {
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

    const update = mergeUpdates(updates.map(Base64.toUint8Array));
    applyUpdate(this.doc, update, "backend");
  }
}
