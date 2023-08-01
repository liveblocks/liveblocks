import type { AuthManager, AuthValue } from "./auth-manager";
import type { BaseAuthResult, Status } from "./connection";
import { ManagedSocket } from "./connection";
import type {
  Callback,
  Observable,
  UnsubscribeCallback,
} from "./lib/EventSource";
import { makeEventSource, EventSource } from "./lib/EventSource";
import { isJsonObject } from "./lib/Json";
import { tryParseJson } from "./lib/utils";
import type { RealtimeEvent } from "./protocol/RealtimeEvents";

export type RealtimeClient = {
  subscribeToEvents: (
    roomId: string,
    callback: Callback<RealtimeEvent>
  ) => UnsubscribeCallback;
  error: Observable<Error>;
  connection: Observable<Status>;
};

function authValueToString(authValue: AuthValue) {
  return authValue.type === "secret"
    ? authValue.token.raw
    : authValue.publicApiKey;
}

export function createRealtimeClient(
  authManager: AuthManager,
  serverEndpoint: string
): RealtimeClient {
  const eventHub = {
    error: makeEventSource<Error>(),
    connection: makeEventSource<Status>(),
    events: {} as Record<string, EventSource<RealtimeEvent>>,
  };

  let managedSocket: ManagedSocket<BaseAuthResult> | null = null;

  function createManagedSocket(roomId: string) {
    managedSocket = new ManagedSocket(
      {
        // TODO: We're trying to (re)connect based on the first roomId that the user is asking for
        // This is bad because the user might now have access to this room (anymore)
        // This prevent any future reconnection to the websocket server
        // We need to find a better way to handle the first (re)connection
        // (Could it be based on the current listeners)
        authenticate: () => authManager.getAuthValue("room:read", roomId),
        createSocket: (authValue: AuthValue) =>
          new WebSocket(
            `${serverEndpoint}?token=${
              authValue.type === "secret"
                ? authValue.token.raw
                : authValue.publicApiKey
            }`
          ),
      },
      true,
      false
    );

    managedSocket.events.statusDidChange.subscribe((status) => {
      // If the websocket (re)connect, we subscribe to any room events
      // based on the current subscribers count
      if (status === "connected") {
        for (const roomId in eventHub.events) {
          const eventSource = eventHub.events[roomId];
          if (eventSource.count() > 0) {
            subscribeToRoomEvents(roomId);
          }
        }
      }

      eventHub.connection.notify(status);
    });

    managedSocket.events.onLiveblocksError.subscribe(eventHub.error.notify);

    managedSocket.events.onMessage.subscribe((event) => {
      if (typeof event.data !== "string") {
        return;
      }

      const jsonEvent = tryParseJson(event.data);

      if (
        jsonEvent !== undefined &&
        isJsonObject(jsonEvent) &&
        typeof jsonEvent.roomId === "string"
      ) {
        eventHub.events[jsonEvent.roomId].notify(jsonEvent as RealtimeEvent);
      }
    });

    managedSocket.connect();
  }

  function getOrCreateEventSource(roomId: string) {
    let eventSource = eventHub.events[roomId];

    if (eventSource === undefined) {
      eventSource = makeEventSource<RealtimeEvent>();
      eventHub.events[roomId] = eventSource;
    }

    return eventSource;
  }

  async function subscribeToRoomEvents(roomId: string) {
    // TODO: Retry strategy / error handling
    const authValue = await authManager.getAuthValue("room:read", roomId);

    // If the websocket is not connected, we don't try to subscribe
    // Room subscription will be done when the websocket reconnects
    if (managedSocket === null || managedSocket.getStatus() !== "connected") {
      return;
    }

    // We're sending a new subscription message everytime there is a new subscriber for code simplicity
    // We could technically avoid this, but this will be a no-op on the backend if the
    managedSocket.send(
      JSON.stringify({
        type: "subscribeToRooms",
        rooms: [roomId],
        token: authValueToString(authValue),
      })
    );
  }

  return {
    subscribeToEvents: (roomId: string, callback: Callback<RealtimeEvent>) => {
      // Create the socket and connect if this is the first subscription
      if (!managedSocket) {
        createManagedSocket(roomId);
      }

      subscribeToRoomEvents(roomId);

      // TODO: Unsubscribe from room events
      return getOrCreateEventSource(roomId).subscribe(callback);
    },
    error: eventHub.error.observable,
    connection: eventHub.connection.observable,
  };
}
