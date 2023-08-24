import {
  ServerMsgCode,
  type RoomStateServerMsg,
  BaseUserMeta,
  CrdtType,
  Json,
  JsonObject,
  ServerMsg,
} from "@liveblocks/core";
import { wait, waitFor } from "./_utils";

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
enum WebSocketErrorCodes {
  CLOSE_ABNORMAL = 1006,
}

export default class MockWebSocket {
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
          scopes: ["room:write"],
          users: {},
        };
        msgCb({ data: JSON.stringify(msg) } as MessageEvent);
      }
    }, 0);
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

  const socket = MockWebSocket.instances[0];
  expect(socket.callbacks.open.length).toBe(1); // Got open callback
  expect(socket.callbacks.message.length).toBe(1); // Got ROOM_STATE message callback

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
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
      items: [["root", { type: CrdtType.OBJECT, data: {} }]],
    });
  }

  function simulateExistingStorageLoaded() {
    simulateIncomingMessage({
      type: ServerMsgCode.INITIAL_STORAGE_STATE,
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
    socket.callbacks.close[0]({
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
