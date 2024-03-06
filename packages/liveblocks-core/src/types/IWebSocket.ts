export interface IWebSocketEvent {
  type: string;
}

export interface IWebSocketCloseEvent extends IWebSocketEvent {
  readonly code: WebsocketCloseCodes;
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

/**
 * The following ranges will be respected by the client:
 *
 *   10xx: client will reauthorize (just like 41xx)
 *   40xx: client will disconnect
 *   41xx: client will reauthorize
 *   42xx: client will retry without reauthorizing (currently not used)
 *
 */
export enum WebsocketCloseCodes {
  /** Normal close of connection, the connection fulfilled its purpose. */
  CLOSE_NORMAL = 1000,
  /** Unexpected error happened with the network/infra level. In spirit akin to HTTP 503 */
  CLOSE_ABNORMAL = 1006,
  /** Unexpected error happened. In spirit akin to HTTP 500 */
  UNEXPECTED_CONDITION = 1011,
  /** Please back off for now, but try again in a few moments */
  TRY_AGAIN_LATER = 1013,
  /** Message wasn't understood, disconnect */
  INVALID_MESSAGE_FORMAT = 4000,
  /** Server refused to allow connection. Re-authorizing won't help. Disconnect. In spirit akin to HTTP 403 */
  NOT_ALLOWED = 4001,
  /** Unused */
  MAX_NUMBER_OF_MESSAGES_PER_SECONDS = 4002,
  /** Unused */
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS = 4003,
  /** Unused */
  MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP = 4004,
  /** Room is full, disconnect */
  MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM = 4005,
  /** The room's ID was updated, disconnect */
  ROOM_ID_UPDATED = 4006,
  /** The server kicked the connection from the room. */
  KICKED = 4100,
  /** The auth token is expired, reauthorize to get a fresh one. In spirit akin to HTTP 401 */
  TOKEN_EXPIRED = 4109,
  /** Disconnect immediately */
  CLOSE_WITHOUT_RETRY = 4999,
}

export function shouldDisconnect(code: WebsocketCloseCodes): boolean {
  return (
    code === WebsocketCloseCodes.CLOSE_WITHOUT_RETRY ||
    ((code as number) >= 4000 && (code as number) < 4100)
  );
}

export function shouldReauth(code: WebsocketCloseCodes): boolean {
  return (code as number) >= 4100 && (code as number) < 4200;
}

export function shouldRetryWithoutReauth(code: WebsocketCloseCodes): boolean {
  return (
    code === WebsocketCloseCodes.TRY_AGAIN_LATER ||
    ((code as number) >= 4200 && (code as number) < 4300)
  );
}
