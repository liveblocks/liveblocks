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

  constructor(room: Room<P, S, U, E>, doc: Doc, config?: LiveblocksYjsOptions) {
    this.doc = doc;
    this.room = room;
    console.log(this.room);
    this.room.getDoc();
    this.doc.on("update", this.handleUpdate);
    this.room.events.connection.subscribe((status) => {
      console.log("Status ", status);
      if (status === "open") {
        this.room.getDoc();
      }
    });
    if (config?.httpEndpoint) {
      this.httpEndpoint = config.httpEndpoint + "?room=" + this.room.id;

      this.room.events.customEvent.subscribe(({ event }) => {
        if ((event as RoomEvent)?.type === "REFRESH") {
          void this.resync();
        }
      });

      void this.resync();
    }
  }

  private handleUpdate = async (update: Uint8Array, origin: string) => {
    //this.room.
    console.log(origin);
    this.room.updateDoc(update);
    if (this.httpEndpoint) {
      await fetch(this.httpEndpoint, {
        method: "POST",
        body: update,
      });
    }
  };

  private async resync() {
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

    const update = mergeUpdates(updates.map(base64ToUint8Array));
    applyUpdate(this.doc, update);
  }
}

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
