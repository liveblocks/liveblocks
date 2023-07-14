import type { AuthManager, AuthValue } from "./auth-manager";
import type { BaseAuthResult, Status } from "./connection";
import { ManagedSocket } from "./connection";
import { assertNever } from "./lib/assert";
import type { Callback } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import { tryParseJson } from "./lib/utils";
import { TokenKind } from "./protocol/AuthToken";
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
  subscribe<E extends keyof RoomEventCallbackMap>(
    type: "events" | E,
    first: string | RoomEventCallbackMap[E],
    second?: RealtimeEventTypes[],
    third?: Callback<RealtimeEvent[]>
  ): () => void;
};

export function makeAuthenticationDelegate(
  roomId: string,
  authManager: AuthManager
): () => Promise<AuthValue> {
  return async () => {
    return authManager.getAuthValue("room:read", roomId);
  };
}

const EVENTS_SERVER = process.env.NEXT_PUBLIC_EVENTS_SERVER as string;


const makeCreateWebSocketDelegate = () => {
  return (authValue: AuthValue) => {

   let authParam = "";
   if (authValue.type === "secret") {
    authParam = `token=${authValue.token.raw}`
   }
   else {
    authParam = `token=${authValue.publicApiKey}`
   }

  return new WebSocket(`${EVENTS_SERVER}?${authParam}`);
  } 
};


export function createRealtimeClient(authManager: AuthManager): RealtimeClient {
  const eventHub = {
    error: makeEventSource<Error>(),
    connection: makeEventSource<Status>(),
    events: makeEventSource<RealtimeEvent[]>(),
  };

  let managedSocket: ManagedSocket<BaseAuthResult> | null = null; 
  
  function createManagedSocket(roomId: string) {
    const delegates = {
      authenticate: makeAuthenticationDelegate(roomId, authManager),
      createSocket: makeCreateWebSocketDelegate(),
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
        eventHub.events.notify([jsonEvent as RealtimeEvent]);
      }
    });
  }
  

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
    console.log("____SUBSCRIBE____", type, first, second, third)
    switch (type) {
      case "events":
        if(
          // If roomId
          typeof first === "string"
        ) {
          const roomId = first;
          authManager.getAuthValue("comments:read", roomId).then((authValue) => {
            const subscribeMessage: {
              type: string;
              rooms: string[];
              token?: string;
            } = {
              type: "subscribeToRooms",
              rooms: [roomId],
            }

            if(authValue.type === "secret" && authValue.token.parsed.k === TokenKind.ACCESS_TOKEN) {
              subscribeMessage.token = authValue.token.raw
            }
           
            if(!managedSocket) {
              console.log("____CREATE MANAGED SOCKET____", roomId)
              createManagedSocket(roomId);
            }

            if (managedSocket) {
              managedSocket.connect();
              managedSocket.send(JSON.stringify(subscribeMessage));
            }
           
          })

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
      }
      case "error":
        return eventHub.error.subscribe(first as Callback<Error>);

      case "connection":
        return eventHub.connection.subscribe(first as Callback<Status>);

      default:
        return assertNever(type, "Unknown event");
    }
  }

  return {
    subscribe,
  };
}
