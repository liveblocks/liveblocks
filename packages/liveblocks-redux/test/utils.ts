import { CrdtType, SerializedCrdtWithId } from "../../liveblocks/lib/cjs/live";

/**
 * https://github.com/Luka967/websocket-close-codes
 */
enum WebSocketErrorCodes {
  CLOSE_ABNORMAL = 1006,
}

export function remove<T>(array: T[], item: T) {
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
  ) {
    this.callbacks[event].push(callback);
  }

  removeEventListener(
    event: "open" | "close" | "message",
    callback: (event: any) => void
  ) {
    // TODO: Fix TS issue
    remove(this.callbacks[event] as any, callback);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {}
}

export function wait(delay: number) {
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
  parentId?: string,
  parentKey?: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Object,
      data,
      parentId,
      parentKey,
    },
  ];
}

export function list(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.List,
      parentId,
      parentKey,
    },
  ];
}

export function map(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Map,
      parentId,
      parentKey,
    },
  ];
}

export function register(
  id: string,
  parentId: string,
  parentKey: string,
  data: any
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Register,
      parentId,
      parentKey,
      data,
    },
  ];
}
