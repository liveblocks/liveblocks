import type { Json } from "@liveblocks/client";
import type {
  IdTuple,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
} from "@liveblocks/core";
import { CrdtType } from "@liveblocks/core";

export function remove<T>(array: T[], item: T): void {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

export class MockWebSocket {
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
    MockWebSocket.instances.push(this);
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

  close(): void {}
}

export function wait(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
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

export function obj(
  id: string,
  data: Record<string, any>,
  parentId: string,
  parentKey: string
): IdTuple<SerializedObject>;
export function obj(
  id: string,
  data: Record<string, any>
): IdTuple<SerializedRootObject>;
export function obj(
  id: string,
  data: Record<string, any>,
  parentId?: string,
  parentKey?: string
): IdTuple<SerializedObject | SerializedRootObject> {
  return [
    id,
    parentId !== undefined && parentKey !== undefined
      ? { type: CrdtType.OBJECT, data, parentId, parentKey }
      : // Root object
        { type: CrdtType.OBJECT, data },
  ];
}

export function list(
  id: string,
  parentId: string,
  parentKey: string
): IdTuple<SerializedList> {
  return [
    id,
    {
      type: CrdtType.LIST,
      parentId,
      parentKey,
    },
  ];
}

export function map(
  id: string,
  parentId: string,
  parentKey: string
): IdTuple<SerializedMap> {
  return [
    id,
    {
      type: CrdtType.MAP,
      parentId,
      parentKey,
    },
  ];
}

export function register(
  id: string,
  parentId: string,
  parentKey: string,
  data: Json
): IdTuple<SerializedRegister> {
  return [
    id,
    {
      type: CrdtType.REGISTER,
      parentId,
      parentKey,
      data,
    },
  ];
}
