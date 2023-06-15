/**
 * A few standard delegate configurations that can be used in unit tests, and
 * that can be used to easily configure the Room's "backend" behavior.
 *
 * Usage:
 *
 *   const { wss, delegates } = defineBehavior(ALWAYS_AUTH_AS(1), SOCKET_CREATE_ONLY);
 *   const { wss, delegates } = defineBehavior(ALWAYS_AUTH_AS(2), SOCKET_AUTO_OPEN);
 */

import { StopRetrying } from "../connection";
import type { RichToken } from "../protocol/AuthToken";
import type { RoomDelegates } from "../room";
import type { WebsocketCloseCodes } from "../types/IWebSocket";
import type { MockWebSocket } from "./_MockWebSocketServer";
import { MockWebSocketServer } from "./_MockWebSocketServer";
import { makeRoomToken } from "./_utils";

type AuthBehavior = () => RichToken;
type SocketBehavior = (wss: MockWebSocketServer) => MockWebSocket;

function makeRichToken(actor: number, scopes: string[]): RichToken {
  const raw = "<some fake JWT token>";
  const parsed = {
    ...makeRoomToken(actor, scopes),
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 60, // Valid for 1 minute
  };
  return { raw, parsed };
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
  delegates: RoomDelegates;
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

  const delegates: RoomDelegates = {
    authenticate: jest.fn(authenticate),
    createSocket: jest.fn(createSocket),
    //            ^^^^^^^ Allow observing these calls in tests
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
export const AUTH_SUCCESS = ALWAYS_AUTH_AS(1);

export function ALWAYS_AUTH_AS(actor: number, scopes: string[] = []) {
  return () => makeRichToken(actor, scopes);
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
 * connection asynchronously. This is the default socket behavior.
 */
export function SOCKET_AUTOCONNECT(wss: MockWebSocketServer) {
  return wss.newSocket((socket) => socket.server.accept());
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
