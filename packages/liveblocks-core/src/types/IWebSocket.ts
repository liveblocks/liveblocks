export interface IWebSocketEvent {
  type: string;
}

export interface IWebSocketCloseEvent extends IWebSocketEvent {
  readonly code: number;
  readonly wasClean: boolean;
  readonly reason: string;
}

export interface IWebSocketMessageEvent extends IWebSocketEvent {
  readonly data: string | Buffer | ArrayBuffer | readonly Buffer[];
}

export interface IWebSocketInstance {
  readonly CONNECTING: number; // 0
  readonly OPEN: number; // 1
  readonly CLOSING: number; // 2
  readonly CLOSED: number; // 3

  readonly readyState: number;

  addEventListener(type: "close", listener: (this: IWebSocketInstance, ev: IWebSocketCloseEvent) => unknown): void; // prettier-ignore
  addEventListener(type: "message", listener: (this: IWebSocketInstance, ev: IWebSocketMessageEvent) => unknown): void; // prettier-ignore
  addEventListener(type: "open" | "error", listener: (this: IWebSocketInstance, ev: IWebSocketEvent) => unknown): void; // prettier-ignore

  removeEventListener(type: "close", listener: (this: IWebSocketInstance, ev: IWebSocketCloseEvent) => unknown): void; // prettier-ignore
  removeEventListener(type: "message", listener: (this: IWebSocketInstance, ev: IWebSocketMessageEvent) => unknown): void; // prettier-ignore
  removeEventListener(type: "open" | "error", listener: (this: IWebSocketInstance, ev: IWebSocketEvent) => unknown): void; // prettier-ignore

  close(): void;
  send(data: string): void;
}

/**
 * Either the browser-based WebSocket API or Node.js' WebSocket API (from the
 * 'ws' package).
 *
 * This type defines the minimal WebSocket API that Liveblocks needs from
 * a WebSocket implementation, and is a minimal subset of the browser-based
 * WebSocket APIs and Node.js' WebSocket API so that both implementations are
 * assignable to this type.
 */
export interface IWebSocket {
  new (address: string): IWebSocketInstance;
}

export enum WebsocketCloseCodes {
  CLOSE_ABNORMAL = 1006,

  INVALID_MESSAGE_FORMAT = 4000,
  NOT_ALLOWED = 4001,
  MAX_NUMBER_OF_MESSAGES_PER_SECONDS = 4002,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS = 4003,
  MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP = 4004,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM = 4005,
  CLOSE_WITHOUT_RETRY = 4999,
}
