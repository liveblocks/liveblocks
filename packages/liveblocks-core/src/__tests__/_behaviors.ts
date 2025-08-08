/**
 * A few standard delegate configurations that can be used in unit tests, and
 * that can be used to easily configure the Room's "backend" behavior.
 *
 * Usage:
 *
 *   const { wss, delegates } = defineBehavior(ALWAYS_AUTH_AS(1), SOCKET_CREATE_ONLY);
 *   const { wss, delegates } = defineBehavior(ALWAYS_AUTH_AS(2), SOCKET_AUTO_OPEN);
 */

import { vi } from "vitest";

import type { AuthValue } from "../auth-manager";
import type { Delegates } from "../connection";
import { StopRetrying } from "../connection";
import type { AuthToken, ParsedAuthToken } from "../protocol/AuthToken";
import { ServerMsgCode } from "../protocol/ServerMsg";
import type { WebsocketCloseCodes } from "../types/IWebSocket";
import type { MockWebSocket } from "./_MockWebSocketServer";
import { MockWebSocketServer } from "./_MockWebSocketServer";
import {
  makeAccessToken,
  makeIDToken,
  makeSecretLegacyToken,
  serverMessage,
} from "./_utils";

type AuthBehavior = () => AuthValue;
type SocketBehavior = (wss: MockWebSocketServer) => MockWebSocket;

function makeParsed(authToken: AuthToken): ParsedAuthToken {
  return {
    raw: "<some fake JWT token>",
    parsed: authToken,
  };
}

/**
 * Configures how the "backend" will behave in unit tests.
 *
 * Generates a delegate pair and an associated observable WebSocket server.
 * Feed the delegate pair into the Room instance you'll be testing, and use the
 * `wss` server to control the socket behavior. You can send it messages, that
 * the Room will then receive and act on. You can use the `wss` value to
 * observe the effects of the Room taking actions.
 */
export function defineBehavior(
  authBehavior: AuthBehavior,
  socketBehavior: SocketBehavior
): {
  wss: MockWebSocketServer;
  delegates: Delegates<AuthValue>;
} {
  const authenticate = () => {
    try {
      return Promise.resolve(authBehavior());
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const wss = new MockWebSocketServer();
  const createSocket = () => socketBehavior(wss);
  const canZombie = () => false;

  const delegates: Delegates<AuthValue> = {
    authenticate: vi.fn(authenticate),
    createSocket: vi.fn(createSocket),
    canZombie: vi.fn(canZombie),
    //         ^^^^^ Allow observing these calls in tests
  };

  return { wss, delegates };
}

//
// Standardized AUTHENTICATION behaviors for use in unit tests.
//

/**
 * Configures the authentication delegate to always successfully authorize as
 * user 1. This is the default auth behavior.
 */
export const AUTH_SUCCESS = ROUND_ROBIN(
  ALWAYS_AUTH_WITH_ACCESS_TOKEN,
  ALWAYS_AUTH_WITH_ID_TOKEN,
  ALWAYS_AUTH_WITH_LEGACY_TOKEN(1),
  ALWAYS_AUTH_WITH_PUBKEY
);

function ROUND_ROBIN(...behaviors: readonly AuthBehavior[]): AuthBehavior {
  if (behaviors.length === 0) {
    throw new Error("Must specify at least one behavior");
  }

  let index = -1;
  return () => {
    index = (index + 1) % behaviors.length;
    const behavior = behaviors[index];
    return behavior();
  };
}

export function ALWAYS_AUTH_WITH_PUBKEY(): AuthValue {
  return {
    type: "public",
    publicApiKey: "pk_xxx",
  };
}

export function ALWAYS_AUTH_WITH_LEGACY_TOKEN(
  actor: number,
  scopes: string[] = []
): () => AuthValue {
  return () => {
    return {
      type: "secret",
      token: makeParsed(makeSecretLegacyToken(actor, scopes)),
    };
  };
}

export function ALWAYS_AUTH_WITH_ID_TOKEN(): AuthValue {
  return {
    type: "secret",
    token: makeParsed(makeIDToken()),
  };
}

export function ALWAYS_AUTH_WITH_ACCESS_TOKEN(): AuthValue {
  return {
    type: "secret",
    token: makeParsed(makeAccessToken()),
  };
}

export function ALWAYS_FAIL_AUTH(): never {
  throw new Error("Random error, like 503 Service Unavailable or whatever");
}

export function UNAUTHORIZED(): never {
  // A type of error that gets treated specially
  throw new StopRetrying("Unauthorized");
}

//
// Standardized SOCKET behaviors for use in unit tests.
//

/**
 * Configures the MockWebSocketServer to *not* automatically accept new socket
 * connections. This means you'll have to manually accept those socket
 * connections explicitly in unit tests, i.e. by calling `wss.last.accept()` to
 * accept the last connection that was made to the server.
 */
export function SOCKET_NO_BEHAVIOR(wss: MockWebSocketServer) {
  return wss.newSocket();
}

/**
 * Configures the MockWebSocketServer to automatically accept each new socket
 * connection. This is the default socket behavior.
 */
export function SOCKET_AUTOCONNECT_BUT_NO_ROOM_STATE(wss: MockWebSocketServer) {
  return wss.newSocket((socket) => socket.server.accept());
}

/**
 * Configures the MockWebSocketServer to automatically accept each new socket
 * connection attempt, and then send an initial ROOM_STATE message (for an
 * empty room, where the connecting client is the first user in the room).
 * Since 1.2, a client isn't considered ready until it has received the
 * ROOM_STATE message.
 */
export function SOCKET_AUTOCONNECT_AND_ROOM_STATE(
  actor: number = 1,
  scopes: string[] = ["room:write"]
) {
  return (wss: MockWebSocketServer) => {
    return wss.newSocket((socket) => {
      // Accept the socket connection...
      socket.server.accept();

      // ...and respond with a ROOM_STATE server message immediately
      socket.server.send(
        serverMessage({
          type: ServerMsgCode.ROOM_STATE,
          actor,
          nonce: `nonce-for-actor-${actor}`,
          scopes,
          users: {},
        })
      );
    });
  };
}

/**
 * The socket will behave by throwing once "new WebSocket()" is called.
 */
export function SOCKET_THROWS(errmsg: string = "You shall not pass") {
  return (_wss: MockWebSocketServer) => {
    throw new Error(errmsg);
  };
}

/**
 * Configures the MockWebSocketServer to accept-and-immediately-close the
 * connection.
 */
export function SOCKET_REFUSES(
  code: WebsocketCloseCodes,
  reason: string = "No good reason"
): SocketBehavior {
  return (wss: MockWebSocketServer) =>
    wss.newSocket((socket) => {
      // Accept-then-immediately-close the connection. This is how the
      // websocket server will refuse a connection that isn't allowed.
      socket.server.accept();
      socket.server.close(
        new CloseEvent("close", {
          reason,
          code,
          wasClean: true,
        })
      );
    });
}

/**
 * Configures the MockWebSocketServer to respond with the given hardcoded
 * sequence of behaviors. The last behavior will be repeated infinitely.
 */
export function SOCKET_SEQUENCE(
  ...sequence: readonly SocketBehavior[]
): SocketBehavior {
  if (sequence.length === 0) {
    throw new Error("Must specify at least one behavior");
  }
  const fallback = sequence[sequence.length - 1];

  let index = 0;
  return (wss: MockWebSocketServer) => {
    const behavior = sequence[index++] ?? fallback;
    return behavior(wss);
  };
}
