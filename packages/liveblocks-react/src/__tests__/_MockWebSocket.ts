import type {
  BaseUserMeta,
  Json,
  JsonObject,
  RoomStateServerMsg,
  ServerMsg,
} from "@liveblocks/core";
import { CrdtType, ServerMsgCode, wait } from "@liveblocks/core";

import { waitFor } from "./_utils";

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
enum WebSocketErrorCodes {
  CLOSE_ABNORMAL = 1006,
}

export default class MockWebSocket {
  public readyState: number;

  static #nextActor = 0;
  public static readonly instances: MockWebSocket[] = [];

  public readonly isMock = true;

  // Registered event listeners
  public readonly callbacks = {
    open: [] as Array<(event?: WebSocketEventMap["open"]) => void>,
    close: [] as Array<(event?: WebSocketEventMap["close"]) => void>,
    error: [] as Array<(event?: WebSocketEventMap["error"]) => void>,
    message: [] as Array<(event?: WebSocketEventMap["message"]) => void>,
  };

  public readonly sentMessages: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    const actor = MockWebSocket.#nextActor++;

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

  public static reset() {
    MockWebSocket.instances.length = 0;
    MockWebSocket.#nextActor = 0;
  }

  addEventListener(event: "open", callback: (event: Event) => void): void;
  addEventListener(event: "close", callback: (event: CloseEvent) => void): void;
  addEventListener(
    event: "message",
    callback: (event: MessageEvent) => void
  ): void;
  addEventListener(
    event: "open" | "close" | "message",
    callback:
      | ((event: Event) => void)
      | ((event: CloseEvent) => void)
      | ((event: MessageEvent) => void)
  ): void {
    this.callbacks[event].push(callback as any);
  }

  removeEventListener(event: "open", callback: (event: Event) => void): void;
  removeEventListener(
    event: "close",
    callback: (event: CloseEvent) => void
  ): void;
  removeEventListener(
    event: "message",
    callback: (event: MessageEvent) => void
  ): void;
  removeEventListener(
    event: "open" | "close" | "message",
    callback:
      | ((event: Event) => void)
      | ((event: CloseEvent) => void)
      | ((event: MessageEvent) => void)
  ): void {
    remove(this.callbacks[event], callback);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close() {
    this.readyState = 3 /* CLOSED */;
  }
}

function remove<T>(array: T[], item: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

export async function waitForSocketToBeConnected() {
  await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));

  const socket = MockWebSocket.instances[0]!;
  expect(socket.callbacks.open).toEqual([expect.any(Function)]); // Got open callback
  expect(socket.callbacks.message).toEqual([expect.any(Function)]); // Got ROOM_STATE message callback

  // Give open callback (scheduled for next tick) a chance to finish before returning
  await wait(0);
  return socket;
}

/**
 * Testing tool to simulate fake incoming server events.
 */
export async function websocketSimulator() {
  const socket = await waitForSocketToBeConnected();

  function simulateIncomingMessage(
    msg: ServerMsg<JsonObject, BaseUserMeta, Json>
  ) {
    socket.callbacks.message.forEach((cb) =>
      cb({
        data: JSON.stringify(msg),
      } as MessageEvent)
    );
  }

  function simulateStorageLoaded() {
    simulateIncomingMessage({
      type: ServerMsgCode.STORAGE_STATE,
      items: [["root", { type: CrdtType.OBJECT, data: {} }]],
    });
  }

  function simulateExistingStorageLoaded() {
    simulateIncomingMessage({
      type: ServerMsgCode.STORAGE_STATE,
      items: [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:0",
          {
            type: CrdtType.OBJECT,
            data: {},
            parentId: "root",
            parentKey: "obj",
          },
        ],
      ],
    });
  }

  function simulateAbnormalClose() {
    socket.callbacks.close[0]!({
      reason: "",
      wasClean: false,
      code: WebSocketErrorCodes.CLOSE_ABNORMAL,
    } as CloseEvent);
  }

  function simulateUserJoins(actor: number, presence: JsonObject) {
    simulateIncomingMessage({
      type: ServerMsgCode.USER_JOINED,
      actor,
      id: undefined,
      info: undefined,
      scopes: ["room:write"],
    });

    simulateIncomingMessage({
      type: ServerMsgCode.UPDATE_PRESENCE,
      targetActor: -1,
      data: presence,
      actor,
    });
  }

  // Simulator API
  return {
    // Field for introspection of simulator state
    sentMessages: socket.sentMessages,
    callbacks: socket.callbacks,

    //
    // Simulating actions (low level)
    //
    simulateIncomingMessage,
    simulateStorageLoaded,
    simulateExistingStorageLoaded,
    simulateAbnormalClose,

    //
    // Composed simulations
    //
    simulateUserJoins,
  };
}
