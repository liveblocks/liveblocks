import type { AuthManager } from "./auth-manager";
import type { Status } from "./connection";
import { ManagedSocket } from "./connection";
import { assertNever } from "./lib/assert";
import type { Callback } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import { tryParseJson } from "./lib/utils";
import type {
  RealtimeEvent,
  RealtimeEventTypes,
} from "./protocol/RealtimeEvents";

type RealtimeCallback = (events: RealtimeEvent[]) => void;

type RoomEventCallbackMap = {
  error: Callback<Error>;
  connection: Callback<Status>;
};

/**
 * The RealtimeClient is the main entry point to the Liveblocks Realtime API.
 */
export type RealtimeClient = {
  connect(): void;
  disconnect(): void;
  subscribe<E extends keyof RoomEventCallbackMap>(
    type: "events" | E,
    first: string | RoomEventCallbackMap[E],
    second?: RealtimeEventTypes[],
    third?: Callback<RealtimeEvent[]>
  ): () => void;
  getConnectionState(): Status;
};

const makeAuthenticationDelegate = (authManager: AuthManager) => async () => {
  const value = await authManager.getAuthValue("comments:read", "");

  if (value.type === "secret") {
    return value.token.raw;
  } else {
    return value.publicApiKey;
  }
};

const EVENTS_SERVER = process.env.NEXT_PUBLIC_EVENTS_SERVER as string;

const makeCreateWebSocketDelegate = () => {
  return (token: string) =>
    // TODO: handle prod & dev
    new WebSocket(`${EVENTS_SERVER}?token=${token}`);
};

export function createRealtimeClient(authManager: AuthManager): RealtimeClient {
  const delegates = {
    authenticate: makeAuthenticationDelegate(authManager),
    createSocket: makeCreateWebSocketDelegate(),
  };

  const managedSocket = new ManagedSocket(delegates);

  const eventHub = {
    error: makeEventSource<Error>(),
    connection: makeEventSource<Status>(),
    events: makeEventSource<RealtimeEvent[]>(),
  };

  /**
   * Send connection events to eventHub
   */
  managedSocket.events.statusDidChange.subscribe((event) =>
    eventHub.connection.notify(event)
  );

  /**
   * Send error events to eventHub
   */
  managedSocket.events.onLiveblocksError.subscribe((event) =>
    eventHub.error.notify(event)
  );

  /**
   * Send regular events to eventHub
   */
  managedSocket.events.onMessage.subscribe((event) => {
    if (typeof event.data !== "string") {
      return;
    }

    const jsonEvent = tryParseJson(event.data);

    if (jsonEvent) {
      eventHub.events.notify([jsonEvent as RealtimeEvent]);
    }
  });

  function subscribe<E extends keyof RoomEventCallbackMap>(
    type: E,
    callback: RoomEventCallbackMap[E]
  ): () => void;
  function subscribe(
    type: "events",
    roomId: string,
    eventTypes: RealtimeEventTypes[],
    callback: RealtimeCallback
  ): () => void;
  function subscribe<E extends keyof RoomEventCallbackMap>(
    type: "events" | E,
    first: string | RoomEventCallbackMap[E],
    second?: RealtimeEventTypes[],
    third?: Callback<RealtimeEvent[]>
  ): () => void {
    switch (type) {
      case "events":
        return eventHub.events.subscribe((events) => {
          const filteredEvents = events.filter(
            (event) =>
              (second as RealtimeEventTypes[]).includes(event.type) &&
              first === event.roomId
          );
          if (filteredEvents.length > 0) {
            (third as RealtimeCallback)(filteredEvents);
          }
        });

      case "error":
        return eventHub.error.subscribe(first as Callback<Error>);

      case "connection":
        return eventHub.connection.subscribe(first as Callback<Status>);

      default:
        return assertNever(type, "Unknown event");
    }
  }

  return {
    connect: () => managedSocket.connect(),
    disconnect: () => managedSocket.disconnect(),
    getConnectionState: () => managedSocket.getStatus(),
    subscribe,
  };
}
