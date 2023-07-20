import type { AuthManager, AuthValue } from "./auth-manager";
import type { BaseAuthResult, Status } from "./connection";
import { ManagedSocket } from "./connection";
import type { Callback, Observable } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import { tryParseJson } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
import type { RealtimeEvent } from "./protocol/RealtimeEvents";

/**
 * The RealtimeClient is the main entry point to the Liveblocks Realtime API.
 */
export type RealtimeClient = {
  subscribe(roomId: string, callback: Callback<RealtimeEvent>): () => void;
  error: Observable<Error>;
  connection: Observable<Status>;
};

export function makeAuthenticationDelegate(
  roomId: string,
  authManager: AuthManager
): () => Promise<AuthValue> {
  return async () => {
    return authManager.getAuthValue("room:read", roomId);
  };
}

const makeCreateWebSocketDelegate = (serverEndpoint: string) => {
  return (authValue: AuthValue) => {
    return new WebSocket(
      `${serverEndpoint}?token=${
        authValue.type === "secret"
          ? authValue.token.raw
          : authValue.publicApiKey
      }`
    );
  };
};

export function createRealtimeClient(
  authManager: AuthManager,
  serverEndpoint: string
): RealtimeClient {
  const eventHub = {
    error: makeEventSource<Error>(),
    connection: makeEventSource<Status>(),
    events: makeEventSource<RealtimeEvent>(),
  };

  let managedSocket: ManagedSocket<BaseAuthResult> | null = null;

  function createManagedSocket(roomId: string) {
    const delegates = {
      authenticate: makeAuthenticationDelegate(roomId, authManager),
      createSocket: makeCreateWebSocketDelegate(serverEndpoint),
    };

    managedSocket = new ManagedSocket(delegates, true);

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
        eventHub.events.notify(jsonEvent as RealtimeEvent);
      }
    });
  }

  function subscribe(
    roomId: string,
    callback: Callback<RealtimeEvent>
  ): () => void {
    authManager.getAuthValue("comments:read", roomId).then((authValue) => {
      const subscribeMessage: {
        type: string;
        rooms: string[];
        token?: string;
      } = {
        type: "subscribeToRooms",
        rooms: [roomId],
      };

      if (
        authValue.type === "secret" &&
        authValue.token.parsed.k === TokenKind.ACCESS_TOKEN
      ) {
        subscribeMessage.token = authValue.token.raw;
      }

      if (!managedSocket) {
        createManagedSocket(roomId);
      }

      if (managedSocket) {
        managedSocket.connect();
        managedSocket.send(JSON.stringify(subscribeMessage));
      }
    });

    return eventHub.events.subscribe((event) => {
      if (event.roomId === roomId) {
        callback(event);
      }
    });
  }

  return {
    subscribe,
    error: eventHub.error.observable,
    connection: eventHub.connection.observable,
  };
}
