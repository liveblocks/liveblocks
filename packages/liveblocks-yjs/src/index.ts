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
    this.doc.on("update", this.handleUpdate);

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
