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

  /** Like an "HTTP 500" */
  UNEXPECTED_CONDITION = 1011,
  /** Please back off for now, but try again in a few moments */
  TRY_AGAIN_LATER = 1013,

  /** Like an "HTTP 403". Server understood the request, but refused to allow it. Re-authorizing won't help. */
  NOT_ALLOWED = 4001,
  /** The auth token used is expired, getting a fresh one and retrying might work. In spirit, it's a bit more akin to an "HTTP 401". */
  TOKEN_EXPIRED = 4009,

  INVALID_MESSAGE_FORMAT = 4000,
  MAX_NUMBER_OF_MESSAGES_PER_SECONDS = 4002,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS = 4003,
  MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP = 4004,
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM = 4005,

  // Puts the client in "disconnected" state immediately, don't try to connect again
  CLOSE_WITHOUT_RETRY = 4999,
}
