import type { Json } from "@liveblocks/client";
import type {
  ListStorageNode,
  MapStorageNode,
  ObjectStorageNode,
  RegisterStorageNode,
  RoomStateServerMsg,
  RootStorageNode,
} from "@liveblocks/core";
import { CrdtType, ServerMsgCode, wait } from "@liveblocks/core";

export function remove<T>(array: T[], item: T): void {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

export class MockWebSocket {
  readyState: number;
  static instances: MockWebSocket[] = [];

  isMock = true;

  callbacks = {
    open: [] as Array<(event?: WebSocketEventMap["open"]) => void>,
    close: [] as Array<(event?: WebSocketEventMap["close"]) => void>,
    error: [] as Array<(event?: WebSocketEventMap["error"]) => void>,
    message: [] as Array<(event?: WebSocketEventMap["message"]) => void>,
  };

  sentMessages: string[] = [];

  constructor(public url: string) {
    const actor = MockWebSocket.instances.push(this) - 1;
    this.readyState = 0 /* CONNECTING */;

    // Fake the server accepting the new connection
    setTimeout(() => {
      this.readyState = 1 /* OPEN */;
      for (const openCb of this.callbacks.open) {
        openCb();
      }

      // Send a ROOM_STATE message to the newly connected client
      for (const msgCb of this.callbacks.message) {
        const msg: RoomStateServerMsg<never> = {
          type: ServerMsgCode.ROOM_STATE,
          actor,
          nonce: `nonce-for-actor-${actor}`,
          scopes: ["room:write"],
          users: {},
          meta: {},
        };
        msgCb({ data: JSON.stringify(msg) } as MessageEvent);
      }
    }, 0);
  }

  addEventListener(
    event: "open" | "close" | "message",
    callback: (event: any) => void
  ): void {
    this.callbacks[event].push(callback);
  }

  removeEventListener(
    event: "open" | "close" | "message",
    callback: (event: any) => void
  ): void {
    // TODO: Fix TS issue
    remove(this.callbacks[event] as any, callback);
  }

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(): void {
    this.readyState = 3 /* CLOSED */;
  }
}

export async function waitFor(predicate: () => boolean): Promise<void> {
  const result = predicate();
  if (result) {
    return;
  }

  const time = new Date().getTime();

  while (new Date().getTime() - time < 2000) {
    await wait(100);
    if (predicate()) {
      return;
    }
  }

  throw new Error("TIMEOUT");
}

export function obj(id: "root", data: Record<string, any>): RootStorageNode;
export function obj(
  id: string,
  data: Record<string, any>,
  parentId: string,
  parentKey: string
): ObjectStorageNode;
export function obj(
  id: string,
  data: Record<string, any>,
  parentId?: string,
  parentKey?: string
): RootStorageNode | ObjectStorageNode {
  return id === "root"
    ? [id, { type: CrdtType.OBJECT, data }]
    : [
        id,
        {
          type: CrdtType.OBJECT,
          data,
          parentId: parentId!,
          parentKey: parentKey!,
        },
      ];
}

export function list(
  id: string,
  parentId: string,
  parentKey: string
): ListStorageNode {
  return [id, { type: CrdtType.LIST, parentId, parentKey }];
}

export function map(
  id: string,
  parentId: string,
  parentKey: string
): MapStorageNode {
  return [id, { type: CrdtType.MAP, parentId, parentKey }];
}

export function register(
  id: string,
  parentId: string,
  parentKey: string,
  data: Json
): RegisterStorageNode {
  return [id, { type: CrdtType.REGISTER, parentId, parentKey, data }];
}
