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

export default class LiveblocksProvider {
  private room: Room<JsonObject, LsonObject, BaseUserMeta, Json>;
  private httpEndpoint?: string;
  private lastUpdateDate: null | Date = null;
  private doc: Y.Doc;

  constructor(
    room: Room<JsonObject, LsonObject, BaseUserMeta, Json>,
    doc: Y.Doc,
    config?: LiveblocksYjsOptions
  ) {
    this.room = room;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.doc = doc;
    if (config?.httpEndpoint) {
      this.httpEndpoint = config.httpEndpoint;
      this.room.subscribe("event", ({ event }) => {
        if ((event as RoomEvent)?.type === "REFRESH") {
          void this.refresh();
        }
      });

      void this.refresh();
    }
  }

  private async refresh() {
    if (!this.httpEndpoint) {
      return;
    }
    const response = await fetch(
      `${this.httpEndpoint}${
        this.lastUpdateDate !== null
          ? `?after=${this.lastUpdateDate.toISOString()}`
          : ""
      }`
    );
    const { updates, lastUpdate } = (await response.json()) as RefreshResponse;

    if (updates.length === 0) {
      return;
    }

    this.lastUpdateDate = new Date(lastUpdate);

    const update = Y.mergeUpdates(updates.map(base64ToUint8Array));
    Y.applyUpdate(this.doc, update);
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
