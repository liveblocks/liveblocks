import { ClientMsgCode, ServerMsgCode } from "@liveblocks/core";
import {
  compactNodesToNodeStream,
  LiveList,
  LiveObject,
  StorageDoc,
  type ClientWireOp,
  type CompactNode,
  type ServerWireOp,
} from "@liveblocks/storage";

export type DemoStorage = {
  items: LiveList<string>;
};

export type RoomClientStatus =
  | "connecting"
  | "loading-storage"
  | "ready"
  | "offline";

export type RoomClientListener = (event: {
  status: RoomClientStatus;
  actor: number | null;
  peers: number;
  root: LiveObject<DemoStorage> | null;
  items: string[];
}) => void;

function wsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

/**
 * Thin Liveblocks Room protocol ↔ `@liveblocks/storage` bridge.
 */
export class RoomClient {
  #socket: WebSocket | null = null;
  #doc: StorageDoc | null = null;
  #root: LiveObject<DemoStorage> | null = null;
  #unsubDoc: (() => void) | null = null;
  #actor: number | null = null;
  #peers = 0;
  #status: RoomClientStatus = "connecting";
  #compactBuffer: CompactNode[] = [];
  #listeners = new Set<RoomClientListener>();
  #reconnectDelay = 1000;
  #cancelled = false;
  #pingTimer: ReturnType<typeof setInterval> | undefined;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  /** Skip echoing local ops we just sent (server will ack; we apply on ack). */
  #applyingRemote = false;

  subscribe(listener: RoomClientListener): () => void {
    this.#listeners.add(listener);
    listener(this.#snapshot());
    return () => {
      this.#listeners.delete(listener);
    };
  }

  start(): void {
    this.#cancelled = false;
    this.#connect();
  }

  stop(): void {
    this.#cancelled = true;
    clearTimeout(this.#reconnectTimer);
    clearInterval(this.#pingTimer);
    this.#teardownDoc();
    this.#socket?.close();
    this.#socket = null;
  }

  getItems(): LiveList<string> | null {
    return this.#root?.get("items") ?? null;
  }

  addItem(text: string): void {
    const items = this.getItems();
    if (!items) return;
    items.push(text);
  }

  removeItem(index: number): void {
    const items = this.getItems();
    if (!items) return;
    items.delete(index);
  }

  moveItem(from: number, to: number): void {
    const items = this.getItems();
    if (!items) return;
    items.move(from, to);
  }

  #snapshot() {
    const items = this.getItems();
    return {
      status: this.#status,
      actor: this.#actor,
      peers: this.#peers,
      root: this.#root,
      items: items ? (items.toJSON() as string[]) : [],
    };
  }

  #notify(): void {
    const snap = this.#snapshot();
    for (const listener of this.#listeners) {
      listener(snap);
    }
  }

  #setStatus(status: RoomClientStatus): void {
    this.#status = status;
    this.#notify();
  }

  #connect(): void {
    this.#setStatus("connecting");
    const socket = new WebSocket(wsUrl());
    this.#socket = socket;

    socket.addEventListener("open", () => {
      this.#reconnectDelay = 1000;
      clearInterval(this.#pingTimer);
      this.#pingTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("ping");
        }
      }, 30_000);
    });

    socket.addEventListener("message", (event) => {
      this.#onMessage(String(event.data));
    });

    socket.addEventListener("close", () => {
      clearInterval(this.#pingTimer);
      this.#teardownDoc();
      this.#socket = null;
      this.#setStatus("offline");
      if (this.#cancelled) return;
      this.#reconnectTimer = setTimeout(() => {
        this.#connect();
      }, this.#reconnectDelay);
      this.#reconnectDelay = Math.min(this.#reconnectDelay * 2, 30_000);
    });
  }

  #onMessage(raw: string): void {
    if (raw === "pong") return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const messages = Array.isArray(parsed) ? parsed : [parsed];
    for (const msg of messages) {
      this.#onServerMsg(msg as { type: number; [key: string]: unknown });
    }
  }

  #onServerMsg(msg: { type: number; [key: string]: unknown }): void {
    switch (msg.type) {
      case ServerMsgCode.ROOM_STATE: {
        this.#actor = msg.actor as number;
        const users = (msg.users ?? {}) as Record<string, unknown>;
        this.#peers = Object.keys(users).length + 1;
        this.#compactBuffer = [];
        this.#setStatus("loading-storage");
        this.#send([{ type: ClientMsgCode.FETCH_STORAGE }]);
        break;
      }

      case ServerMsgCode.USER_JOINED: {
        this.#peers += 1;
        this.#notify();
        break;
      }

      case ServerMsgCode.USER_LEFT: {
        this.#peers = Math.max(1, this.#peers - 1);
        this.#notify();
        break;
      }

      case ServerMsgCode.STORAGE_CHUNK: {
        const nodes = msg.nodes as CompactNode[];
        this.#compactBuffer.push(...nodes);
        break;
      }

      case ServerMsgCode.STORAGE_STREAM_END: {
        this.#hydrateFromBuffer();
        break;
      }

      case ServerMsgCode.UPDATE_STORAGE: {
        if (!this.#doc) return;
        this.#applyingRemote = true;
        try {
          this.#doc.apply(msg.ops as ServerWireOp[]);
        } finally {
          this.#applyingRemote = false;
        }
        this.#ensureItemsList();
        this.#notify();
        break;
      }

      case ServerMsgCode.REJECT_STORAGE_OP: {
        console.error("Storage op rejected:", msg.reason);
        break;
      }

      default:
        break;
    }
  }

  #hydrateFromBuffer(): void {
    if (this.#actor === null) return;

    this.#teardownDoc();

    const stream = [...compactNodesToNodeStream(this.#compactBuffer)];
    this.#compactBuffer = [];

    const { doc, root } = StorageDoc.fromNodes(stream, {
      getActorId: () => this.#actor ?? 0,
    });

    this.#doc = doc;
    this.#root = root as LiveObject<DemoStorage>;

    this.#unsubDoc = doc.subscribe(({ ops }) => {
      if (this.#applyingRemote || ops.length === 0) return;
      this.#sendOps(ops);
      this.#notify();
    });

    this.#ensureItemsList();
    this.#setStatus("ready");
  }

  /**
   * Empty rooms only have `["root", {}]`. Create the demo `items` list once.
   */
  #ensureItemsList(): void {
    const root = this.#root;
    if (!root) return;
    const existing = root.get("items");
    if (existing instanceof LiveList) return;
    root.set("items", new LiveList<string>([]));
  }

  #sendOps(ops: readonly ClientWireOp[]): void {
    this.#send([{ type: ClientMsgCode.UPDATE_STORAGE, ops: [...ops] }]);
  }

  #send(messages: unknown[]): void {
    const socket = this.#socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(messages));
  }

  #teardownDoc(): void {
    this.#unsubDoc?.();
    this.#unsubDoc = null;
    this.#doc = null;
    this.#root = null;
  }
}
